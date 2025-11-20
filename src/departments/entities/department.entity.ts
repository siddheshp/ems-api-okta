import { Employee } from "../../employees/entities/employee.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'Departments' })
export class Department {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({ nullable: false, length: 30 })
    name: string;

    @OneToMany(()=> Employee, (emp)=> emp.Department)
    Employees?: Employee[]
}
