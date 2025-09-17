import { IsNotEmpty, IsEnum, IsString, IsOptional } from 'class-validator';
import { AttendanceType } from '../entities/attendance.entity';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsString()
  carnet: string;

  @IsNotEmpty()
  @IsEnum(AttendanceType)
  type: AttendanceType;

  @IsOptional()
  @IsString()
  recordedAt?: string;

  @IsNotEmpty()
  @IsString()
  imageBase64: string;
}
