# NestJS Unit Testing Guide - Mocking Repository Pattern

## Overview
This guide walks through the `employees.service.spec.ts` file, demonstrating best practices for unit testing a NestJS service that uses TypeORM repositories with proper mocking techniques.

## Table of Contents
1. [Test File Structure](#test-file-structure)
2. [Setting Up Mocks](#setting-up-mocks)
3. [Testing CRUD Operations](#testing-crud-operations)
4. [Exception Handling Tests](#exception-handling-tests)
5. [Key Takeaways](#key-takeaways)

---

## Test File Structure

### Imports
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesService } from './employees.service';
import { Employee } from './entities/employee.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
```

**Key Points:**
- `Test` and `TestingModule` - NestJS testing utilities for creating test modules
- `getRepositoryToken` - Critical for mocking TypeORM repositories
- Import the service, entity, DTOs, and exceptions you'll be testing

---

## Setting Up Mocks

### Creating a Mock Repository

```typescript
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
```

**Key Concepts:**

1. **Mock Repository Type**: `Partial<Record<keyof Repository<Employee>, jest.Mock>>`
   - Creates a type-safe mock with Jest mock functions
   - Only includes methods we actually use in the service

2. **`getRepositoryToken(Employee)`**: 
   - Returns the injection token that NestJS uses for the Employee repository
   - This is what tells NestJS to inject our mock instead of a real repository

3. **`useValue: mockRepository`**:
   - Provides our mock as the repository implementation
   - All repository calls in the service will use this mock

4. **Why Mock?**
   - Unit tests should test business logic, not database operations
   - Mocks are fast and don't require database setup
   - Tests are isolated and predictable

### Cleanup
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```
- Clears all mock call history between tests
- Ensures tests don't interfere with each other

---

## Testing CRUD Operations

### 1. Read Operations - `findAll()`

```typescript
describe('findAll', () => {
  it('should return all employees', async () => {
    const mockEmployees: Employee[] = [
      { id: 1, name: 'Ravi', email: 'ravi@test.com', salary: 50000, 
        dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1 },
      { id: 2, name: 'Priya', email: 'priya@test.com', salary: 60000, 
        dateOfBirth: new Date('1992-02-02'), mobileNumber: 9876543210, departmentId: 2 },
    ];
    mockRepository.find.mockResolvedValue(mockEmployees);

    const result = await service.findAll();

    expect(result).toEqual(mockEmployees);
    expect(result).toHaveLength(2);
    expect(mockRepository.find).toHaveBeenCalled();
  });
});
```

**What's Happening:**
1. **Setup**: Define mock data that represents what the database would return
2. **Mock Configuration**: `mockResolvedValue()` makes the mock return our test data
3. **Execution**: Call the service method
4. **Assertions**:
   - Verify the result matches expected data
   - Check the result length
   - Confirm the repository method was called

### 2. Read Operations - `findOne(id)`

```typescript
describe('findOne', () => {
  it('should return one employee by id', async () => {
    const mockEmployee: Employee = {
      id: 1, name: 'Ravi', email: 'ravi@test.com', salary: 50000,
      dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1,
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
```

**Key Testing Patterns:**

1. **Happy Path Testing**: Test when data is found
   - `toHaveBeenCalledWith({ id: 1 })` verifies correct parameters were passed

2. **Error Path Testing**: Test when data doesn't exist
   - Mock returns `null` to simulate not found
   - `rejects.toThrow(NotFoundException)` verifies proper exception handling

### 3. Create Operations - `create(dto)`

```typescript
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
      id: 1, name: 'Existing', email: 'new@test.com', salary: 50000,
      dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1,
    };
    mockRepository.findOneBy.mockResolvedValue(existingEmployee);

    await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email: createDto.email });
    expect(mockRepository.insert).not.toHaveBeenCalled();
  });
});
```

**Important Concepts:**

1. **Testing Business Logic**: 
   - Service checks for duplicate email before inserting
   - First test: no duplicate exists (null) → successful creation
   - Second test: duplicate exists → ConflictException thrown

2. **Multiple Mock Calls**:
   - `findOneBy` is called first (duplicate check)
   - `insert` is called only if no duplicate

3. **Negative Assertions**:
   - `.not.toHaveBeenCalled()` verifies method wasn't called when it shouldn't be

### 4. Update Operations - `update(id, dto)`

```typescript
describe('update', () => {
  const updateDto: UpdateEmployeeDto = {
    name: 'Updated Name',
    salary: 65000,
  };

  it('should update an employee', async () => {
    const existingEmployee: Employee = {
      id: 1, name: 'Old Name', email: 'test@test.com', salary: 50000,
      dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1,
    };
    mockRepository.findOneBy.mockResolvedValue(existingEmployee);
    mockRepository.update.mockResolvedValue({ affected: 1, generatedMaps: [], raw: [] });

    const result = await service.update(1, updateDto);

    expect(result.name).toBe(updateDto.name);
    expect(result.salary).toBe(updateDto.salary);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(mockRepository.update).toHaveBeenCalledWith(
      { id: 1 }, 
      expect.objectContaining(updateDto)
    );
  });

  it('should throw NotFoundException when employee not found', async () => {
    mockRepository.findOneBy.mockResolvedValue(null);

    await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 999 });
    expect(mockRepository.update).not.toHaveBeenCalled();
  });
});
```

**Testing Strategy:**

1. **Partial Updates**: `UpdateEmployeeDto` uses `PartialType`
   - Only specified fields need to be updated
   - `expect.objectContaining(updateDto)` checks for subset match

2. **Object Mutation**: Service uses `Object.assign()` to merge changes
   - Test verifies the returned object has updated values

### 5. Delete Operations - `remove(id)`

```typescript
describe('remove', () => {
  it('should delete an employee', async () => {
    const existingEmployee: Employee = {
      id: 1, name: 'To Delete', email: 'delete@test.com', salary: 50000,
      dateOfBirth: new Date('1990-01-01'), mobileNumber: 1234567890, departmentId: 1,
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
```

---

## Exception Handling Tests

### Why Test Exceptions?

Exception handling is critical business logic that needs testing:

1. **NotFoundException**: Resource doesn't exist (404)
2. **ConflictException**: Duplicate/constraint violation (409)

### Pattern for Testing Exceptions

```typescript
await expect(service.methodName(params)).rejects.toThrow(ExceptionType);
```

**Components:**
- `expect()` - Jest assertion
- `await` - Wait for async operation
- `.rejects` - Indicates we expect a rejection/exception
- `.toThrow(ExceptionType)` - Specific exception class to match

---

## Key Takeaways

### 1. **AAA Pattern** (Arrange-Act-Assert)
```typescript
// Arrange: Setup mock data and behavior
mockRepository.findOneBy.mockResolvedValue(mockEmployee);

// Act: Execute the method under test
const result = await service.findOne(1);

// Assert: Verify results and behaviors
expect(result).toEqual(mockEmployee);
expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
```

### 2. **Test Both Happy and Error Paths**
- Happy path: Everything works as expected
- Error path: Handle invalid input, missing data, conflicts

### 3. **Mock Return Values Match Real Data**
- Mock data should have the same structure as entity
- Include all required fields
- Use realistic test data

### 4. **Verify Method Calls**
```typescript
expect(mockRepository.find).toHaveBeenCalled();
expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
expect(mockRepository.insert).not.toHaveBeenCalled();
```

### 5. **Isolation is Key**
- Each test is independent
- `beforeEach` sets up fresh state
- `afterEach` cleans up mocks
- Tests don't share state

### 6. **Mock Configuration Methods**
```typescript
jest.fn()                           // Create a mock function
.mockResolvedValue(data)           // Async success with data
.mockRejectedValue(error)          // Async failure with error
.mockReturnValue(data)             // Sync return
.mockImplementation((args) => {})  // Custom implementation
```

### 7. **Common Jest Matchers**
```typescript
expect(value).toBe(expected)              // Strict equality
expect(value).toEqual(expected)           // Deep equality
expect(value).toHaveLength(n)             // Array/string length
expect(fn).toHaveBeenCalled()             // Function was called
expect(fn).toHaveBeenCalledWith(args)     // Called with specific args
expect(fn).not.toHaveBeenCalled()         // Function wasn't called
expect(promise).rejects.toThrow(Error)    // Async exception
expect(obj).toMatchObject(partial)        // Partial object match
expect(obj).objectContaining(partial)     // Subset matcher
```

---

## Running the Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test employees.service.spec.ts
```

---

## Best Practices Summary

✅ **DO:**
- Mock external dependencies (databases, APIs)
- Test one unit of functionality at a time
- Test both success and failure scenarios
- Use descriptive test names
- Keep tests simple and readable
- Clean up after each test

❌ **DON'T:**
- Connect to real databases in unit tests
- Test multiple things in one test
- Make tests depend on each other
- Use hard-coded IDs from databases
- Skip error case testing

---

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeORM Repository API](https://typeorm.io/repository-api)

---

## Practice Exercises

1. **Add a test** for updating only the salary field
2. **Add a test** for creating an employee with invalid data
3. **Add a test** for finding employees by department
4. **Mock a failure** in the database insert operation
5. **Add integration tests** that use a real test database

---

*Happy Testing! 🧪*
