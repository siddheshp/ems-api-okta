import { Department } from "../../departments/entities/department.entity";
import { Check, Column, Entity, ForeignKey, ManyToOne, PrimaryGeneratedColumn } from "typeorm";

@Entity({name: 'Employees'})
@Check(`"salary" >= 1`)
export class Employee {
    @PrimaryGeneratedColumn()
    id?: number

    @Column({ nullable: false, length: 70})
    name: string;

    @Column({nullable: false, unique: true, length: 30})
    email: string;

    @Column({nullable:false, })
    salary: number;

    @Column({nullable:false, })
    dateOfBirth: Date;

    @Column({nullable:false, type:"long"})
    mobileNumber: number

    @Column({nullable:false})
    //@ForeignKey()
    departmentId: number

    @ManyToOne(()=> Department, (dept)=> dept.Employees)
    Department?: Department
}
