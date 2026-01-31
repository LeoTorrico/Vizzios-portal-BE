import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Attendance, AttendanceType } from './entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { DashboardAttendanceDto } from './dto/dashboard-attendance.dto';
import { v2 as Cloudinary } from 'cloudinary';

interface DashboardRow {
  date: string;
  employeeCarnet: string;
  firstName: string;
  lastName: string;
  entrada: Date;
  salida: Date;
  totalHoras: number;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
    @Inject('CLOUDINARY') private cloudinary: typeof Cloudinary,
  ) {}

  private async uploadToCloudinary(base64: string) {
    const result = await this.cloudinary.uploader.upload(
      base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`,
      {
        folder: 'attendance_images',
        unique_filename: true,
      },
    );
    return result;
  }

  async create(dto: CreateAttendanceDto, branchId: string) {
    // Validar empleado y determinar tipo en paralelo
    const [employee, type] = await Promise.all([
      this.employeeRepo.findOne({ where: { carnet: dto.carnet } }),
      this.resolveAttendanceType(dto.carnet, branchId),
    ]);

    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();

    // Subir imagen después de validaciones
    const upload = await this.uploadToCloudinary(dto.imageBase64);

    const attendance = this.attendanceRepo.create({
      employeeCarnet: employee.carnet,
      branchId,
      type,
      recordedAt,
      imageUrl: upload.secure_url,
      rawName: upload.public_id,
    });

    return this.attendanceRepo.save(attendance);
  }

  async findAll(params: FilterAttendanceDto) {
    const { page = 1, limit = 10, startDate, endDate, branchId } = params;
    const skip = (page - 1) * limit;
    const where: FindOptionsWhere<Attendance> = {};

    if (branchId) {
      where.branchId = branchId;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.recordedAt = Between(start, end);
    }

    const [data, total] = await this.attendanceRepo.findAndCount({
      where,
      relations: ['employee', 'branch'],
      order: { recordedAt: 'DESC' },
      take: limit,
      skip: skip,
    });

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  findByBranch(branchId: string) {
    return this.attendanceRepo.find({
      where: { branchId },
      relations: ['employee'],
      order: { recordedAt: 'DESC' },
    });
  }

  private async resolveAttendanceType(
    carnet: string,
    branchId: string,
  ): Promise<AttendanceType> {
    const lastAttendance = await this.attendanceRepo.findOne({
      where: {
        employeeCarnet: carnet,
        branchId,
      },
      order: {
        recordedAt: 'DESC',
      },
    });

    if (!lastAttendance) {
      return AttendanceType.IN;
    }

    return lastAttendance.type === AttendanceType.IN
      ? AttendanceType.OUT
      : AttendanceType.IN;
  }

  async getDashboard(params: DashboardAttendanceDto) {
    const {
      branchId,
      employeeCarnet,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = params;
    const offset = (page - 1) * limit;

    // Construir WHERE dinámicamente
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (branchId) {
      conditions.push(`a."branchId" = $${paramIndex++}`);
      queryParams.push(branchId);
    }

    if (employeeCarnet) {
      conditions.push(`a."employeeCarnet" = $${paramIndex++}`);
      queryParams.push(employeeCarnet);
    }

    if (startDate && endDate) {
      conditions.push(
        `DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz') BETWEEN $${paramIndex++} AND $${paramIndex++}`,
      );
      queryParams.push(startDate, endDate);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Query SIN FILTER (compatible con todas las versiones de PostgreSQL)
    const dataQuery = `
    WITH attendances_with_next AS (
      SELECT 
        a."employeeCarnet",
        a."type",
        a."recordedAt",
        DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz') as fecha_local,
        e."firstName",
        e."lastName",
        LEAD(a."recordedAt") OVER (
          PARTITION BY a."employeeCarnet", DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz')
          ORDER BY a."recordedAt"
        ) as siguiente_recordedAt,
        LEAD(a."type") OVER (
          PARTITION BY a."employeeCarnet", DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz')
          ORDER BY a."recordedAt"
        ) as siguiente_tipo
      FROM attendances a
      INNER JOIN employees e ON e.carnet = a."employeeCarnet"
      ${whereClause}
    ),
    pares_entrada_salida AS (
      SELECT 
        fecha_local as date,
        "employeeCarnet",
        "firstName",
        "lastName",
        "recordedAt" as entrada,
        siguiente_recordedAt as salida,
        CASE 
          WHEN siguiente_recordedAt IS NOT NULL AND siguiente_tipo = 'OUT'
          THEN ROUND(EXTRACT(EPOCH FROM (siguiente_recordedAt - "recordedAt")) / 3600.0, 2)
          ELSE NULL
        END as "totalHoras"
      FROM attendances_with_next
      WHERE type = 'IN'
        AND siguiente_tipo = 'OUT'
    )
    SELECT *
    FROM pares_entrada_salida
    ORDER BY date DESC, "employeeCarnet" ASC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex}
  `;

    queryParams.push(limit, offset);

    const data = await this.attendanceRepo.query(dataQuery, queryParams);

    // Contar total
    const countQuery = `
    WITH attendances_with_next AS (
      SELECT 
        a."employeeCarnet",
        a."type",
        DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz') as fecha_local,
        LEAD(a."type") OVER (
          PARTITION BY a."employeeCarnet", DATE(a."recordedAt" AT TIME ZONE 'America/La_Paz')
          ORDER BY a."recordedAt"
        ) as siguiente_tipo
      FROM attendances a
      ${whereClause}
    )
    SELECT COUNT(*) as total
    FROM attendances_with_next
    WHERE type = 'IN' AND siguiente_tipo = 'OUT'
  `;

    const [{ total }] = await this.attendanceRepo.query(
      countQuery,
      queryParams.slice(0, -2),
    );

    return {
      data: data.map((row: any) => ({
        date:
          row.date instanceof Date
            ? row.date.toISOString().split('T')[0]
            : row.date,
        employee: {
          carnet: row.employeeCarnet,
          firstName: row.firstName,
          lastName: row.lastName,
        },
        entrada: row.entrada,
        salida: row.salida,
        totalHoras: parseFloat(row.totalHoras) || 0,
      })),
      meta: {
        total: parseInt(total),
        page: Number(page),
        lastPage: Math.ceil(parseInt(total) / Number(limit)),
        limit: Number(limit),
      },
    };
  }
}
