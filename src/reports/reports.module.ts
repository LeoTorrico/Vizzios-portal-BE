import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Attendance } from '../attendance/entities/attendance.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Branch } from '../branch/entities/branch.entity';
import { Vacation } from '../vacation/entities/vacation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Employee, Branch, Vacation])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule { }
