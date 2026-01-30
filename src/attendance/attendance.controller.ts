import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { FilterAttendanceDto } from './dto/filter-attendance.dto';
import { TerminalTokenGuard } from 'src/guard/terminal-token.guard';
import { DashboardAttendanceDto } from './dto/dashboard-attendance.dto';

@Controller('attendances')
export class AttendanceController {
  constructor(private service: AttendanceService) {}

  @UseGuards(TerminalTokenGuard)
  @Post()
  create(@Body() dto: CreateAttendanceDto, @Req() req) {
    return this.service.create(dto, req.branchId);
  }

  @Get('dashboard')
  getDashboard(@Query() params: DashboardAttendanceDto) {
    return this.service.getDashboard(params);
  }

  @Get()
  findAll(@Query() params: FilterAttendanceDto) {
    return this.service.findAll(params);
  }

  @Get('branch/:branchId')
  findByBranch(
    @Param('branchId') branchId: string,
    @Query() params: FilterAttendanceDto,
  ) {
    return this.service.findAll({ ...params, branchId });
  }
}
