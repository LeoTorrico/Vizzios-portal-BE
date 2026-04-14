import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { WeeklyReportDto } from './dto/weekly-report.dto';
import { MonthlyReportDto } from './dto/monthly-report.dto';
import { MonthlyEmployeeReportDto } from './dto/monthly-employee-report.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('weekly')
  getWeeklyReport(@Query() dto: WeeklyReportDto) {
    return this.reportsService.getWeeklyReport(dto);
  }

  @Get('monthly-employee')
  getMonthlyEmployeeReport(@Query() dto: MonthlyEmployeeReportDto) {
    return this.reportsService.getMonthlyEmployeeReport(dto);
  }

  @Get('monthly')
  getMonthlyReport(@Query() dto: MonthlyReportDto) {
    return this.reportsService.getMonthlyReport(dto);
  }
}
