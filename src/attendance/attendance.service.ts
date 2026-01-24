import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { v2 as Cloudinary } from 'cloudinary';

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

  async create(dto: CreateAttendanceDto) {
    const employee = await this.employeeRepo.findOne({
      where: { carnet: dto.carnet },
    });
    if (!employee) {
      throw new BadRequestException('Empleado no encontrado');
    }

    const recordedAt = dto.recordedAt ? new Date(dto.recordedAt) : new Date();
    const upload = await this.uploadToCloudinary(dto.imageBase64);

    const attendance = this.attendanceRepo.create({
      employeeCarnet: employee.carnet,
      branchId: employee.branchId,
      type: dto.type,
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
}
