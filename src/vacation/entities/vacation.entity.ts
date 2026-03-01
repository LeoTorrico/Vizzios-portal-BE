import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Check,
} from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('vacations')
@Check(`"endDate" >= "startDate"`)
export class Vacation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'employeeCarnet' })
    employeeCarnet: string;

    @ManyToOne(() => Employee, (employee) => employee.vacations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'employeeCarnet' })
    employee: Employee;

    @Column({ type: 'date' })
    startDate: string;

    @Column({ type: 'date' })
    endDate: string;

    @Column({ type: 'varchar', nullable: true })
    reason: string;

    @CreateDateColumn()
    createdAt: Date;
}
