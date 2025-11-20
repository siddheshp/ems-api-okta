import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Repository } from 'typeorm';

@Injectable()
export class EmployeesService {
  constructor(@InjectRepository(Employee) private empRepo: Repository<Employee>) {
  }

  async create(dto: CreateEmployeeDto): Promise<Employee> {
    //duplicate
    const existingEmp = await this.empRepo.findOneBy({ email: dto.email });
    if (existingEmp)
      throw new ConflictException();

    //create
    let emp: Employee = {
      name: dto.name,
      dateOfBirth: new Date(dto.dateOfBirth),
      email: dto.email,
      mobileNumber: dto.mobileNumber,
      salary: dto.salary,
      departmentId: dto.departmentId
    };
    //await this.empRepo.create(emp);
    await this.empRepo.insert(emp);
    return emp;
  }

  async findAll(): Promise<Employee[]> {
    return await this.empRepo.find();
  }

  async findOne(id: number) {
    let emp = await this.empRepo.findOneBy({ id });
    if (emp)
      return emp;
    throw new NotFoundException();
  }

  async update(id: number, dto: UpdateEmployeeDto): Promise<Employee | null> {
    let emp = await this.empRepo.findOneBy({ id });
    if (!emp)
      throw new NotFoundException();

    Object.assign(emp, dto);
    await this.empRepo.update({ id: id }, emp);
    return emp;
  }

  async remove(id: number): Promise<void> {
    let emp = await this.empRepo.findOneBy({ id });
    if (!emp)
      throw new NotFoundException();

    await this.empRepo.delete(id);
  }
}
