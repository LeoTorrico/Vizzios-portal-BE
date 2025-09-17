import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @Post()
  create(@Body() dto: CreateAttendanceDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('branch/:branchId')
  findByBranch(@Param('branchId') branchId: string) {
    return this.service.findByBranch(branchId);
  }
}
