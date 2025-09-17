import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(Branch)
    private branchRepo: Repository<Branch>,
  ) {}

  create(dto: CreateBranchDto) {
    const branch = this.branchRepo.create(dto);
    return this.branchRepo.save(branch);
  }

  findAll() {
    return this.branchRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: string) {
    return this.branchRepo.findOne({ where: { id } });
  }
}
