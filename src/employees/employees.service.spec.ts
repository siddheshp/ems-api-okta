import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let mockRepository: Partial<Record<keyof Repository<Employee>, jest.Mock>>;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all employees', async () => {
      const mockEmployees: Employee[] = [
        { id: 1, name: 'Ravi', email: 'ravi@test.com', salary: 50000, dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1 },
        { id: 2, name: 'Priya', email: 'priya@test.com', salary: 60000, dateOfBirth: new Date('1992-02-02'), mobileNumber: 9876543210, departmentId: 2 },
      ];
      mockRepository.find.mockResolvedValue(mockEmployees);

      const result = await service.findAll();

      expect(result).toEqual(mockEmployees);
      expect(result).toHaveLength(2);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return one employee by id', async () => {
      const mockEmployee: Employee = {
        id: 1,
        name: 'Ravi',
        email: 'ravi@test.com',
        salary: 50000,
        dateOfBirth: new Date('1990-01-01'),
        mobileNumber: 1234567890,
        departmentId: 1,
      };
      mockRepository.findOneBy.mockResolvedValue(mockEmployee);

      const result = await service.findOne(1);

      expect(result).toEqual(mockEmployee);
      expect(result.name).toBe('Ravi');
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    });
  });

  describe('create', () => {
    const createDto: CreateEmployeeDto = {
      name: 'New Employee',
      email: 'new@test.com',
      salary: 55000,
      dateOfBirth: '1995-05-05',
      mobileNumber: 5555555555,
      departmentId: 1,
    };

    it('should create a new employee', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);
      mockRepository.insert.mockResolvedValue({ generatedMaps: [], identifiers: [], raw: [] });

      const result = await service.create(createDto);

      expect(result.name).toBe(createDto.name);
      expect(result.email).toBe(createDto.email);
      expect(result.salary).toBe(createDto.salary);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email: createDto.email });
      expect(mockRepository.insert).toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingEmployee: Employee = {
        id: 1,
        name: 'Existing',
        email: 'new@test.com',
        salary: 50000,
        dateOfBirth: new Date('1990-01-01'),
        mobileNumber: 1234567890,
        departmentId: 1,
      };
      mockRepository.findOneBy.mockResolvedValue(existingEmployee);

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email: createDto.email });
      expect(mockRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto: UpdateEmployeeDto = {
      name: 'Updated Name',
      salary: 65000,
    };

    it('should update an employee', async () => {
      const existingEmployee: Employee = {
        id: 1,
        name: 'Old Name',
        email: 'test@test.com',
        salary: 50000,
        dateOfBirth: new Date('1990-01-01'),
        mobileNumber: 1234567890,
        departmentId: 1,
      };
      mockRepository.findOneBy.mockResolvedValue(existingEmployee);
      mockRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

      const result = await service.update(1, updateDto);

      expect(result.name).toBe(updateDto.name);
      expect(result.salary).toBe(updateDto.salary);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.update).toHaveBeenCalledWith({ id: 1 }, expect.objectContaining(updateDto));
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an employee', async () => {
      const existingEmployee: Employee = {
        id: 1,
        name: 'To Delete',
        email: 'delete@test.com',
        salary: 50000,
        dateOfBirth: new Date('1990-01-01'),
        mobileNumber: 1234567890,
        departmentId: 1,
      };
      mockRepository.findOneBy.mockResolvedValue(existingEmployee);
      mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove(1);

      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when employee not found', async () => {
      mockRepository.findOneBy.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });
  });
});
