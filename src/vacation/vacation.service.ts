import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vacation } from './entities/vacation.entity';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { UpdateVacationDto } from './dto/update-vacation.dto';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class VacationService {
    constructor(
        @InjectRepository(Vacation)
        private readonly vacationRepo: Repository<Vacation>,
        @InjectRepository(Employee)
        private readonly employeeRepo: Repository<Employee>,
    ) { }

    async create(createDto: CreateVacationDto): Promise<Vacation> {
        const employee = await this.employeeRepo.findOne({
            where: { carnet: createDto.employeeCarnet },
        });

        if (!employee) {
            throw new NotFoundException('Empleado no encontrado');
        }

        if (new Date(createDto.startDate) > new Date(createDto.endDate)) {
            throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
        }

        const vacation = this.vacationRepo.create(createDto);
        return this.vacationRepo.save(vacation);
    }

    findAll(): Promise<Vacation[]> {
        return this.vacationRepo.find({
            relations: ['employee'],
            order: { startDate: 'DESC' },
        });
    }

    async findOne(id: string): Promise<Vacation> {
        const vacation = await this.vacationRepo.findOne({
            where: { id },
            relations: ['employee'],
        });

        if (!vacation) {
            throw new NotFoundException('Vacación no encontrada');
        }

        return vacation;
    }

    findByEmployee(employeeCarnet: string): Promise<Vacation[]> {
        return this.vacationRepo.find({
            where: { employeeCarnet },
            order: { startDate: 'DESC' },
        });
    }

    async update(id: string, updateDto: UpdateVacationDto): Promise<Vacation> {
        const vacation = await this.findOne(id);

        if (
            updateDto.startDate &&
            updateDto.endDate &&
            new Date(updateDto.startDate) > new Date(updateDto.endDate)
        ) {
            throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin');
        } else if (updateDto.startDate && new Date(updateDto.startDate) > new Date(vacation.endDate)) {
            if (!updateDto.endDate) {
                throw new BadRequestException('La fecha de inicio no puede ser posterior a la fecha de fin actual');
            }
        } else if (updateDto.endDate && new Date(vacation.startDate) > new Date(updateDto.endDate)) {
            if (!updateDto.startDate) {
                throw new BadRequestException('La fecha de fin no puede ser anterior a la fecha de inicio actual');
            }
        }

        Object.assign(vacation, updateDto);
        return this.vacationRepo.save(vacation);
    }

    async remove(id: string): Promise<void> {
        const vacation = await this.findOne(id);
        await this.vacationRepo.remove(vacation);
    }
}
