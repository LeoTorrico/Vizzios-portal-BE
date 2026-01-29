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
      limit = 10,
    } = params;
    const offset = (page - 1) * limit;

    // Construir WHERE dinámicamente
    const conditions: string[] = ['a1."type" = \'IN\''];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (branchId) {
      conditions.push(`a1."branchId" = $${paramIndex++}`);
      queryParams.push(branchId);
    }

    if (employeeCarnet) {
      conditions.push(`a1."employeeCarnet" = $${paramIndex++}`);
      queryParams.push(employeeCarnet);
    }

    if (startDate && endDate) {
      conditions.push(
        `a1."recordedAt" BETWEEN $${paramIndex++} AND $${paramIndex++}`,
      );
      queryParams.push(new Date(startDate), new Date(endDate + ' 23:59:59'));
    }

    const whereClause = conditions.join(' AND ');

    // Query optimizado
    const dataQuery = `
    WITH entrada_salida AS (
      SELECT 
        DATE(a1."recordedAt") as fecha,
        a1."employeeCarnet",
        e."firstName",
        e."lastName",
        a1."recordedAt" as entrada,
        (
          SELECT MIN(a2."recordedAt")
          FROM attendances a2
          WHERE a2."employeeCarnet" = a1."employeeCarnet"
            AND DATE(a2."recordedAt") = DATE(a1."recordedAt")
            AND a2."type" = 'OUT'
            AND a2."recordedAt" > a1."recordedAt"
        ) as salida
      FROM attendances a1
      INNER JOIN employees e ON e.carnet = a1."employeeCarnet"
      WHERE ${whereClause}
    )
    SELECT 
      fecha as date,
      "employeeCarnet",
      "firstName",
      "lastName",
      entrada,
      salida,
      CASE 
        WHEN salida IS NOT NULL 
        THEN ROUND(EXTRACT(EPOCH FROM (salida - entrada)) / 3600.0, 2)
        ELSE NULL
      END as "totalHoras"
    FROM entrada_salida
    WHERE salida IS NOT NULL
    ORDER BY fecha DESC, "employeeCarnet" ASC
    LIMIT $${paramIndex++}
    OFFSET $${paramIndex}
  `;

    queryParams.push(limit, offset);

    const data = await this.attendanceRepo.query(dataQuery, queryParams);

    // Contar total
    const countQuery = `
    WITH entrada_salida AS (
      SELECT 
        a1."employeeCarnet",
        a1."recordedAt" as entrada,
        (
          SELECT MIN(a2."recordedAt")
          FROM attendances a2
          WHERE a2."employeeCarnet" = a1."employeeCarnet"
            AND DATE(a2."recordedAt") = DATE(a1."recordedAt")
            AND a2."type" = 'OUT'
            AND a2."recordedAt" > a1."recordedAt"
        ) as salida
      FROM attendances a1
      WHERE ${whereClause}
    )
    SELECT COUNT(*) as total
    FROM entrada_salida
    WHERE salida IS NOT NULL
  `;

    const [{ total }] = await this.attendanceRepo.query(
      countQuery,
      queryParams.slice(0, -2), // Sin limit y offset
    );

    return {
      data: data.map((row: any) => ({
        date: row.date,
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
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }
}
