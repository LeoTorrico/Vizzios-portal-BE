import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Branch } from '../../branch/entities/branch.entity';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  carnet: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @ManyToOne(() => Branch, (branch) => branch.employees, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: string;

  @OneToMany(() => Attendance, (att) => att.employee)
  attendances: Attendance[];

  @CreateDateColumn()
  createdAt: Date;
}
