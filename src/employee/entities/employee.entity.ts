import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Attendance } from '../../attendance/entities/attendance.entity';

@Entity('employees')
export class Employee {
  @PrimaryColumn()
  carnet: string;

  @Column()
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @OneToMany(() => Attendance, (att) => att.employee)
  attendances: Attendance[];

  @CreateDateColumn()
  createdAt: Date;
}
