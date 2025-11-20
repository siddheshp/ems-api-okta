import { ConflictException, Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Repository } from 'typeorm';

@Injectable()
export class DepartmentsService {
  constructor(@InjectRepository(Department) private deptRepo: Repository<Department>){

  }

  async create(dto: CreateDepartmentDto) {
    //duplicate
    let dept = await this.deptRepo.findOneBy({name: dto.name});
    console.log(dept);

    if(dept)
      throw new ConflictException();
    //insert
    let newDept: Department = {
      name: dto.name
    }
    await this.deptRepo.insert(newDept);
    return newDept;
  }

  async findAll() {
    return await this.deptRepo.find();
  }

  async findOne(id: number) {
    return await this.deptRepo.findOneBy({id});
  }

  update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    return `This action updates a #${id} department`;
  }

  remove(id: number) {
    return `This action removes a #${id} department`;
  }
}
