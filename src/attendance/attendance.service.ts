import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepo: Repository<Attendance>,
    @InjectRepository(Employee)
    private employeeRepo: Repository<Employee>,
  ) {}

  private async uploadToCloudinary(base64: string) {
    const result = await cloudinary.uploader.upload(
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

  findAll() {
    return this.attendanceRepo.find({
      relations: ['employee', 'branch'],
      order: { recordedAt: 'DESC' },
    });
  }

  findByBranch(branchId: string) {
    return this.attendanceRepo.find({
      where: { branchId },
      relations: ['employee'],
      order: { recordedAt: 'DESC' },
    });
  }
}
