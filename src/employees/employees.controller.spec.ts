import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('EmployeesController', () => {
  let controller: EmployeesController;
  let mockEmployeesService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockEmployeesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: mockEmployeesService,
        },
      ],
    }).compile();

    controller = module.get<EmployeesController>(EmployeesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateEmployeeDto = {
      name: 'John Doe',
      email: 'john@test.com',
      salary: 50000,
      dateOfBirth: '1990-01-15',
      mobileNumber: 1234567890,
      departmentId: 1,
    };

    const createdEmployee: Employee = {
      id: 1,
      name: 'John Doe',
      email: 'john@test.com',
      salary: 50000,
      dateOfBirth: new Date('1990-01-15'),
      mobileNumber: 1234567890,
      departmentId: 1,
    };

    it('should create a new employee', async () => {
      mockEmployeesService.create.mockResolvedValue(createdEmployee);

      const result = await controller.create(createDto);

      expect(result).toEqual(createdEmployee);
      expect(mockEmployeesService.create).toHaveBeenCalledWith(createDto);
      expect(mockEmployeesService.create).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException when email already exists', async () => {
      mockEmployeesService.create.mockRejectedValue(new ConflictException());

      await expect(controller.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockEmployeesService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of employees', async () => {
      const employees: Employee[] = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@test.com',
          salary: 50000,
          dateOfBirth: new Date('1990-01-15'),
          mobileNumber: 1234567890,
          departmentId: 1,
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@test.com',
          salary: 60000,
          dateOfBirth: new Date('1992-05-20'),
          mobileNumber: 9876543210,
          departmentId: 2,
        },
      ];
      mockEmployeesService.findAll.mockResolvedValue(employees);

      const result = await controller.findAll();

      expect(result).toEqual(employees);
      expect(result).toHaveLength(2);
      expect(mockEmployeesService.findAll).toHaveBeenCalled();
      expect(mockEmployeesService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return an empty array when no employees exist', async () => {
      mockEmployeesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
      expect(mockEmployeesService.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const employee: Employee = {
      id: 1,
      name: 'John Doe',
      email: 'john@test.com',
      salary: 50000,
      dateOfBirth: new Date('1990-01-15'),
      mobileNumber: 1234567890,
      departmentId: 1,
    };

    it('should return a single employee by id', async () => {
      mockEmployeesService.findOne.mockResolvedValue(employee);

      const result = await controller.findOne(1);

      expect(result).toEqual(employee);
      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(1);
      expect(mockEmployeesService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeesService.findOne.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockEmployeesService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('update', () => {
    const updateDto: UpdateEmployeeDto = {
      name: 'John Updated',
      salary: 55000,
    };

    const updatedEmployee: Employee = {
      id: 1,
      name: 'John Updated',
      email: 'john@test.com',
      salary: 55000,
      dateOfBirth: new Date('1990-01-15'),
      mobileNumber: 1234567890,
      departmentId: 1,
    };

    it('should update an employee', async () => {
      mockEmployeesService.update.mockResolvedValue(updatedEmployee);

      const result = await controller.update(1, updateDto);

      expect(result).toEqual(updatedEmployee);
      expect(result?.name).toBe('John Updated');
      expect(result?.salary).toBe(55000);
      expect(mockEmployeesService.update).toHaveBeenCalledWith(1, updateDto);
      expect(mockEmployeesService.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeesService.update.mockRejectedValue(new NotFoundException());

      await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
      expect(mockEmployeesService.update).toHaveBeenCalledWith(999, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete an employee', async () => {
      mockEmployeesService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(1);

      expect(result).toBeUndefined();
      expect(mockEmployeesService.remove).toHaveBeenCalledWith(1);
      expect(mockEmployeesService.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockEmployeesService.remove.mockRejectedValue(new NotFoundException());

      await expect(controller.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockEmployeesService.remove).toHaveBeenCalledWith(999);
    });
  });
});
