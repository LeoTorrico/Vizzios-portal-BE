import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Branch } from '../branch/entities/branch.entity';
import { WeeklyReportDto } from './dto/weekly-report.dto';
import { MonthlyReportDto } from './dto/monthly-report.dto';
import {
  WeeklyReportResponse,
  DayDetail,
} from './interfaces/weekly-report.interface';
import {
  MonthlyReportResponse,
  BranchReport,
  TopEmployee,
} from './interfaces/monthly-report.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
  ) {}

  /**
   * Genera reporte semanal de un empleado
   * Calcula desde primera entrada hasta última salida por día
   */
  async getWeeklyReport(dto: WeeklyReportDto): Promise<WeeklyReportResponse> {
    const { employeeCarnet, weekStartDate, branchId } = dto;

    const employee = await this.employeeRepo.findOne({
      where: { carnet: employeeCarnet },
    });

    if (!employee) throw new NotFoundException('Empleado no encontrado');

    const startDate = new Date(weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6); // Semana completa
    const weekEndDate = endDate.toISOString().split('T')[0];

    // LÓGICA:
    // 1. raw_marks: Obtenemos todas las marcas.
    // 2. pairs: Usamos LEAD para armar pares IN -> OUT.
    // 3. valid_pairs: Filtramos SOLO los pares que ocurren el MISMO DÍA (DATE(in) == DATE(out)).
    // 4. daily_summary: Agrupamos por fecha para sumar horas reales y obtener hora visual de inicio/fin.

    const query = `
    WITH raw_marks AS (
      SELECT 
        a."recordedAt" AT TIME ZONE 'America/La_Paz' as marca_local,
        a.type,
        DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz') as fecha_local
      FROM attendances a
      WHERE a."employeeCarnet" = $1
        AND DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz') BETWEEN $2 AND $3
        ${branchId ? 'AND a."branchId" = $4' : ''}
    ),
    pairs AS (
      SELECT 
        fecha_local,
        marca_local as entrada,
        LEAD(marca_local) OVER (ORDER BY marca_local) as salida,
        type as tipo_entrada,
        LEAD(type) OVER (ORDER BY marca_local) as tipo_salida
      FROM raw_marks
    ),
    daily_stats AS (
      SELECT 
        fecha_local,
        -- Hora visual: La primera entrada del día
        MIN(entrada) as primera_entrada,
        -- Hora visual: La última salida del día
        MAX(CASE WHEN tipo_entrada = 'OUT' THEN entrada ELSE salida END) as ultima_salida,
        -- Suma de horas: Solo sumamos si es par IN->OUT y es el MISMO día
        SUM(
          CASE 
            WHEN tipo_entrada = 'IN' 
                 AND tipo_salida = 'OUT' 
                 AND DATE(entrada) = DATE(salida) -- REGLA DE ORO: Mismo día
            THEN EXTRACT(EPOCH FROM (salida - entrada)) / 3600.0
            ELSE 0
          END
        ) as horas_reales,
        -- Detectar incompleto: Si hay un IN sin OUT en el mismo día al final
        BOOL_OR(tipo_entrada = 'IN' AND (tipo_salida IS NULL OR tipo_salida = 'IN' OR DATE(salida) != DATE(entrada))) as tiene_incompleto
      FROM pairs
      WHERE tipo_entrada = 'IN' OR tipo_entrada = 'OUT'
      GROUP BY fecha_local
    )
    SELECT 
      fecha_local as fecha,
      EXTRACT(ISODOW FROM fecha_local) as "diaSemana",
      TO_CHAR(primera_entrada, 'HH24:MI:SS') as entrada,
      TO_CHAR(ultima_salida, 'HH24:MI:SS') as salida,
      ROUND(horas_reales, 2) as horas,
      tiene_incompleto as incompleto
    FROM daily_stats
    ORDER BY fecha ASC
    `;

    const params = branchId
      ? [employeeCarnet, weekStartDate, weekEndDate, branchId]
      : [employeeCarnet, weekStartDate, weekEndDate];

    const desglose = await this.attendanceRepo.query(query, params);

    // Cálculos finales en JS
    const diasCompletos = desglose.filter((d) => !d.incompleto);
    const totalHoras = diasCompletos.reduce(
      (sum, d) => sum + (parseFloat(d.horas) || 0),
      0,
    );
    const diasTrabajados = desglose.length; // Cuenta días con al menos una marca
    const promedioDiario =
      diasCompletos.length > 0 ? totalHoras / diasCompletos.length : 0;
    const nombresDias = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ];

    return {
      employee: {
        carnet: employee.carnet,
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
      week: { startDate: weekStartDate, endDate: weekEndDate },
      summary: {
        totalHoras: Math.round(totalHoras * 100) / 100,
        promedioDiario: Math.round(promedioDiario * 100) / 100,
        diasTrabajados,
      },
      desglose: desglose.map((day) => ({
        ...day,
        fecha:
          day.fecha instanceof Date
            ? day.fecha.toISOString().split('T')[0]
            : day.fecha,
        diaSemana: nombresDias[Number(day.diaSemana) - 1],
        horas: parseFloat(day.horas),
      })),
    };
  }

  /**
   * Genera reporte mensual por sucursal(es)
   * Solo cuenta pares válidos (IN → OUT)
   */
  async getMonthlyReport(
    dto: MonthlyReportDto,
  ): Promise<MonthlyReportResponse> {
    const { year, month, branchId } = dto;

    // Lógica compartida para sucursales y top empleados
    // CTE que aplanamos para reutilizar concepto
    const coreLogic = `
      WITH raw_data AS (
         SELECT 
            a."branchId",
            a."employeeCarnet",
            a."recordedAt" AT TIME ZONE 'America/La_Paz' as marca,
            a.type
         FROM attendances a
         WHERE EXTRACT(YEAR FROM (a."recordedAt" AT TIME ZONE 'America/La_Paz')) = $1
           AND EXTRACT(MONTH FROM (a."recordedAt" AT TIME ZONE 'America/La_Paz')) = $2
           ${branchId ? 'AND a."branchId" = $3' : ''}
      ),
      pairs AS (
        SELECT 
          "branchId",
          "employeeCarnet",
          marca as entrada,
          LEAD(marca) OVER (PARTITION BY "employeeCarnet" ORDER BY marca) as salida,
          type as tipo_entrada,
          LEAD(type) OVER (PARTITION BY "employeeCarnet" ORDER BY marca) as tipo_salida
        FROM raw_data
      ),
      valid_hours AS (
        SELECT 
          "branchId",
          "employeeCarnet",
          -- Solo sumamos si es par valido en el MISMO DIA
          CASE 
            WHEN tipo_entrada = 'IN' 
                 AND tipo_salida = 'OUT' 
                 AND DATE(entrada) = DATE(salida) 
            THEN EXTRACT(EPOCH FROM (salida - entrada)) / 3600.0
            ELSE 0
          END as horas
        FROM pairs
        WHERE tipo_entrada = 'IN' -- Filtro base
      )
    `;

    // 1. QUERY DE SUCURSALES
    const branchQuery = `
      ${coreLogic},
      branch_summary AS (
        SELECT 
          "branchId",
          COUNT(DISTINCT "employeeCarnet") as empleados_activos,
          SUM(horas) as total_horas
        FROM valid_hours
        GROUP BY "branchId"
      )
      SELECT 
        b.id as "branchId",
        b.name as "branchName",
        COALESCE(bs.total_horas, 0) as "totalHoras",
        COALESCE(bs.empleados_activos, 0) as "empleadosActivos",
        CASE 
          WHEN COALESCE(bs.empleados_activos, 0) > 0 
          THEN ROUND(COALESCE(bs.total_horas, 0) / bs.empleados_activos, 2)
          ELSE 0
        END as "promedioPorEmpleado"
      FROM branches b
      LEFT JOIN branch_summary bs ON bs."branchId" = b.id
      ${branchId ? 'WHERE b.id = $3' : ''}
      ORDER BY "totalHoras" DESC
    `;

    const params = branchId ? [year, month, branchId] : [year, month];
    const branchesData = await this.branchRepo.query(branchQuery, params);

    // 2. QUERY TOP EMPLEADOS (Iteramos sobre los resultados anteriores)
    const branches: BranchReport[] = await Promise.all(
      branchesData.map(async (branch) => {
        // Reutilizamos la misma lógica core pero filtrando por branch especifico en el WHERE
        const topQuery = `
          WITH raw_data AS (
             SELECT 
                a."employeeCarnet",
                a."recordedAt" AT TIME ZONE 'America/La_Paz' as marca,
                a.type
             FROM attendances a
             WHERE a."branchId" = $1 -- Filtro por sucursal actual
               AND EXTRACT(YEAR FROM (a."recordedAt" AT TIME ZONE 'America/La_Paz')) = $2
               AND EXTRACT(MONTH FROM (a."recordedAt" AT TIME ZONE 'America/La_Paz')) = $3
          ),
          pairs AS (
            SELECT 
              "employeeCarnet",
              marca as entrada,
              LEAD(marca) OVER (PARTITION BY "employeeCarnet" ORDER BY marca) as salida,
              type as tipo_entrada,
              LEAD(type) OVER (PARTITION BY "employeeCarnet" ORDER BY marca) as tipo_salida
            FROM raw_data
          )
          SELECT 
            e.carnet,
            e."firstName" || ' ' || e."lastName" as nombre,
            ROUND(SUM(
              CASE 
                WHEN tipo_entrada = 'IN' 
                     AND tipo_salida = 'OUT' 
                     AND DATE(entrada) = DATE(salida) 
                THEN EXTRACT(EPOCH FROM (salida - entrada)) / 3600.0
                ELSE 0
              END
            ), 2) as horas
          FROM pairs p
          INNER JOIN employees e ON e.carnet = p."employeeCarnet"
          WHERE p.tipo_entrada = 'IN'
          GROUP BY e.carnet, e."firstName", e."lastName"
          HAVING SUM(CASE WHEN tipo_entrada='IN' AND tipo_salida='OUT' AND DATE(entrada)=DATE(salida) THEN 1 ELSE 0 END) > 0
          ORDER BY horas DESC
          LIMIT 5
        `;

        const topEmpleados = await this.employeeRepo.query(topQuery, [
          branch.branchId,
          year,
          month,
        ]);

        return {
          branchId: branch.branchId,
          branchName: branch.branchName,
          totalHoras: parseFloat(branch.totalHoras) || 0,
          empleadosActivos: parseInt(branch.empleadosActivos) || 0,
          promedioPorEmpleado: parseFloat(branch.promedioPorEmpleado) || 0,
          topEmpleados: topEmpleados.map((e) => ({
            ...e,
            horas: parseFloat(e.horas),
          })),
        };
      }),
    );

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    return {
      period: {
        year,
        month,
        monthName: monthNames[month - 1],
      },
      branches,
    };
  }
}
