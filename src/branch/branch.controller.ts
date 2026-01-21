import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { BranchService } from './branch.service';
import { CreateBranchDto } from './dto/create-branch.dto';

@Controller('branches')
export class BranchController {
  constructor(private service: BranchService) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }
  @Post()
  create(@Body() dto: CreateBranchDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
