import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';
import { Branch } from '../../branch/entities/branch.entity';

export enum AttendanceType {
  IN = 'IN',
  OUT = 'OUT',
}

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee, (emp) => emp.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeCarnet' })
  employee: Employee;

  @Column()
  employeeCarnet: string; // ahora usamos carnet directamente

  @ManyToOne(() => Branch, (branch) => branch.attendances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column()
  branchId: string;

  @Column({
    type: 'enum',
    enum: AttendanceType,
  })
  type: AttendanceType;

  @Column({ type: 'timestamptz' })
  recordedAt: Date;

  @Column()
  imageUrl: string;

  @Column({ nullable: true })
  rawName: string;

  @CreateDateColumn()
  createdAt: Date;
}
