import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VacationService } from './vacation.service';
import { VacationController } from './vacation.controller';
import { Vacation } from './entities/vacation.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vacation, Employee])],
    controllers: [VacationController],
    providers: [VacationService],
    exports: [VacationService],
})
export class VacationModule { }
