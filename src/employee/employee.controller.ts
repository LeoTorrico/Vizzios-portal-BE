import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly service: EmployeeService) {}

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
  @Patch(':carnet')
  update(@Param('carnet') carnet: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(carnet, dto);
  }

  @Delete(':carnet')
  remove(@Param('carnet') carnet: string) {
    return this.service.remove(carnet);
  }
}
