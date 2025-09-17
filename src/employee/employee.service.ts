import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';

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
}
