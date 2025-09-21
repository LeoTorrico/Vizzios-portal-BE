import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeModule } from './employee/employee.module';
import { BranchModule } from './branch/branch.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5440,
      username: 'postgres',
      password: 'password',
      database: 'attendance_db',
      autoLoadEntities: true,
      synchronize: true,
    }),
    EmployeeModule,
    BranchModule,
    AttendanceModule,
  ],
})
export class AppModule {}
