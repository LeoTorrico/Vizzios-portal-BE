import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Attendance } from '../../attendance/entities/attendance.entity';
import { Vacation } from '../../vacation/entities/vacation.entity';

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

  @OneToMany(() => Vacation, (vac) => vac.employee)
  vacations: Vacation[];

  @CreateDateColumn()
  createdAt: Date;
}
