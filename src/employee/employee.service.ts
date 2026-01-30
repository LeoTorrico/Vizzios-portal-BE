import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const exists = await this.employeeRepo.findOne({
      where: { carnet: dto.carnet },
    });
    if (exists) {
      throw new BadRequestException('El carnet ya está registrado');
    }

    const employee = this.employeeRepo.create(dto);
    return this.employeeRepo.save(employee);
  }

  findAll() {
    return this.employeeRepo.find({ order: { createdAt: 'DESC' } });
  }
  async update(carnet: string, dto: UpdateEmployeeDto) {
    const employee = await this.employeeRepo.findOne({
      where: { carnet },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    Object.assign(employee, dto);

    return this.employeeRepo.save(employee);
  }
  async remove(carnet: string) {
    const employee = await this.employeeRepo.findOne({
      where: { carnet },
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    await this.employeeRepo.remove(employee);

    return {
      message: 'Empleado eliminado correctamente',
    };
  }
}
