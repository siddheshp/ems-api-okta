# NestJS Controller Unit Testing Guide - Mocking Services

This guide demonstrates best practices for unit testing NestJS controllers by mocking service dependencies. Controllers handle HTTP requests and delegate business logic to services.

---

## Controller vs Service Testing

### What Controllers Do
- Handle HTTP requests (GET, POST, PUT/PATCH, DELETE)
- Extract parameters from routes, query strings, and request bodies
- Call service methods with proper parameters
- Return responses to clients
- Apply guards, interceptors, and pipes

### What We Test in Controllers
✅ Correct service methods are called with correct parameters
✅ Controller returns what the service returns
✅ Exceptions from service are properly propagated
✅ Route parameters are correctly parsed and passed

❌ We DON'T test business logic (that's in the service)
❌ We DON'T test database operations (that's in the service)

---

## Test File Structure

### Imports
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';
```

**Key Points:**
- Import both the controller and the service (to mock it)
- Import DTOs for request body types
- Import entity for response types
- Import exceptions that might be thrown

---

## Setting Up Service Mocks

### Creating a Mock Service

```typescript
let controller: EmployeesController;
let mockEmployeesService: Partial<Record<keyof EmployeesService, jest.Mock>>;

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
```

**Key Concepts:**

1. **Mock Service Type**: `Partial<Record<keyof EmployeesService, jest.Mock>>`
   - Type-safe mock containing all service methods
   - Each method is a Jest mock function

2. **Service as Provider**:
   ```typescript
   providers: [
     {
       provide: EmployeesService,
       useValue: mockEmployeesService,
     },
   ]
   ```
   - Tells NestJS to inject our mock instead of real service
   - Controller receives the mock in its constructor

3. **Why Mock the Service?**
   - Controller tests should be fast and isolated
   - Business logic testing belongs in service tests
   - We only verify controller delegates correctly

### Cleanup
```typescript
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Testing HTTP Endpoints

### 1. POST Request - Create Employee

```typescript
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
```

**What We're Testing:**

1. **Request Body Handling** (`@Body()` decorator)
   - DTO is passed correctly to service
   - Controller receives and forwards the DTO

2. **Success Response**
   - Controller returns what service returns
   - No transformation or modification

3. **Error Handling**
   - Exceptions from service propagate through controller
   - `mockRejectedValue()` simulates service throwing exception

**Controller Code Being Tested:**
```typescript
@Post()
async create(@Body() createEmployeeDto: CreateEmployeeDto) {
  return await this.employeesService.create(createEmployeeDto);
}
```

### 2. GET Request - Retrieve All Employees

```typescript
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
```

**Testing Strategy:**

1. **Happy Path**: Service returns data
   - Verify array is returned unchanged
   - Check service was called exactly once

2. **Edge Case**: No data exists
   - Empty array is valid response
   - Not an error condition

**Controller Code Being Tested:**
```typescript
@Get()
async findAll() {
  return await this.employeesService.findAll();
}
```

### 3. GET Request with Route Parameter - Find One Employee

```typescript
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
```

**Important Details:**

1. **Route Parameter Extraction** (`@Param('id')`)
   - Controller receives `id` from URL path
   - `+id` converts string to number in actual controller
   - Test calls with number directly

2. **Not Found Scenario**
   - Service throws `NotFoundException`
   - Controller doesn't catch it (propagates to NestJS)
   - Client receives 404 response

**Controller Code Being Tested:**
```typescript
@Get(':id')
async findOne(@Param('id') id: number) {
  return await this.employeesService.findOne(+id);
}
```

### 4. PATCH Request - Update Employee

```typescript
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
    expect(result.name).toBe('John Updated');
    expect(result.salary).toBe(55000);
    expect(mockEmployeesService.update).toHaveBeenCalledWith(1, updateDto);
    expect(mockEmployeesService.update).toHaveBeenCalledTimes(1);
  });

  it('should throw NotFoundException when employee not found', async () => {
    mockEmployeesService.update.mockRejectedValue(new NotFoundException());

    await expect(controller.update(999, updateDto)).rejects.toThrow(NotFoundException);
    expect(mockEmployeesService.update).toHaveBeenCalledWith(999, updateDto);
  });
});
```

**Testing Focus:**

1. **Multiple Parameters**
   - Route parameter: `id`
   - Request body: `updateDto`
   - Both passed correctly to service

2. **Partial Updates**
   - `UpdateEmployeeDto` can have subset of fields
   - Only specified fields are updated
   - Service handles the logic

**Controller Code Being Tested:**
```typescript
@Patch(':id')
async update(@Param('id') id: number, @Body() updateEmployeeDto: UpdateEmployeeDto) {
  return await this.employeesService.update(+id, updateEmployeeDto);
}
```

### 5. DELETE Request - Remove Employee

```typescript
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
```

**Key Points:**

1. **No Return Value**
   - Delete operations typically return `void` or `undefined`
   - HTTP 200 OK with no body (or 204 No Content)

2. **Error Handling**
   - Cannot delete non-existent resource
   - Service throws exception, controller propagates

**Controller Code Being Tested:**
```typescript
@Delete(':id')
async remove(@Param('id') id: number) {
  return await this.employeesService.remove(+id);
}
```

---

## Parameter Handling

### Types of Parameters in NestJS Controllers

1. **Route Parameters** (`@Param()`)
   ```typescript
   @Get(':id')
   findOne(@Param('id') id: number) // URL: /employees/123
   ```

2. **Request Body** (`@Body()`)
   ```typescript
   @Post()
   create(@Body() dto: CreateEmployeeDto) // JSON in request body
   ```

3. **Query Parameters** (`@Query()`)
   ```typescript
   @Get()
   findAll(@Query('dept') deptId: number) // URL: /employees?dept=5
   ```

### Testing Parameter Extraction

**Route Parameters:**
```typescript
// Controller receives from URL path
await controller.findOne(1);
expect(mockService.findOne).toHaveBeenCalledWith(1);
```

**Request Body:**
```typescript
// Controller receives from HTTP body
const dto = { name: 'John', email: 'john@test.com', ... };
await controller.create(dto);
expect(mockService.create).toHaveBeenCalledWith(dto);
```

**Multiple Parameters:**
```typescript
// Combination of route param and body
await controller.update(1, updateDto);
expect(mockService.update).toHaveBeenCalledWith(1, updateDto);
```

---

## Key Takeaways

### 1. **Controller Tests Are About Delegation**
```typescript
// We test that controller...
✅ Calls the right service method
✅ Passes the right parameters
✅ Returns what service returns
✅ Doesn't catch exceptions (lets them propagate)

// We DON'T test...
❌ Business logic (service's job)
❌ Database operations (service's job)
❌ Data validation (pipes' job, tested separately)
```

### 2. **Mock Service, Not Repository**
```typescript
// ✅ Correct: Mock the direct dependency
providers: [
  {
    provide: EmployeesService,
    useValue: mockEmployeesService,
  },
]

// ❌ Wrong: Don't mock repository in controller tests
// Repository is service's dependency, not controller's
```

### 3. **Test Exception Propagation**
```typescript
// Service throws exception
mockEmployeesService.findOne.mockRejectedValue(new NotFoundException());

// Controller doesn't catch it
await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);

// NestJS handles it and returns proper HTTP status
```

### 4. **Verify Call Parameters**
```typescript
expect(mockService.method).toHaveBeenCalledWith(expectedParams);
expect(mockService.method).toHaveBeenCalledTimes(1);
```

### 5. **AAA Pattern in Controller Tests**
```typescript
it('should return employee by id', async () => {
  // Arrange: Setup mock service response
  mockEmployeesService.findOne.mockResolvedValue(employee);
  
  // Act: Call controller method
  const result = await controller.findOne(1);
  
  // Assert: Verify behavior
  expect(result).toEqual(employee);
  expect(mockEmployeesService.findOne).toHaveBeenCalledWith(1);
});
```

### 6. **Testing HTTP Methods**

| HTTP Method | Controller Decorator | Typical Return |
|-------------|---------------------|----------------|
| GET         | `@Get()`            | Entity or array |
| POST        | `@Post()`           | Created entity |
| PATCH/PUT   | `@Patch()` / `@Put()` | Updated entity |
| DELETE      | `@Delete()`         | void or deleted entity |

### 7. **Common Assertions for Controllers**
```typescript
// Return value matches
expect(result).toEqual(expectedData);

// Service was called correctly
expect(mockService.method).toHaveBeenCalled();
expect(mockService.method).toHaveBeenCalledWith(params);
expect(mockService.method).toHaveBeenCalledTimes(1);

// Exceptions propagate
await expect(controller.method()).rejects.toThrow(ExceptionType);
```

---

## Comparison: Controller vs Service Tests

### Controller Tests Focus On:
```typescript
✅ HTTP request handling
✅ Parameter extraction (@Param, @Body, @Query)
✅ Calling correct service method
✅ Returning service response
✅ Exception propagation
✅ Guards and interceptors (integration level)
```

### Service Tests Focus On:
```typescript
✅ Business logic
✅ Data validation
✅ Database operations (mocked)
✅ Exception throwing
✅ Data transformation
✅ Complex calculations
```

---

## Testing Guards (Advanced)

Your controller has commented-out guards:
```typescript
@Post()
//@UseGuards(OktaAuthGuard, AdminGuard)
async create(@Body() createEmployeeDto: CreateEmployeeDto) {
```

### How to Test with Guards

```typescript
it('should be protected by guards', () => {
  const guards = Reflect.getMetadata('__guards__', controller.create);
  expect(guards).toContain(OktaAuthGuard);
  expect(guards).toContain(AdminGuard);
});
```

Or use integration tests:
```typescript
// In e2e test
it('should return 401 without auth token', () => {
  return request(app.getHttpServer())
    .post('/employees')
    .send(createDto)
    .expect(401);
});
```

---

## Best Practices Summary

### ✅ DO:
- Mock service dependencies
- Test parameter passing
- Test both success and error cases
- Verify service methods are called correctly
- Keep tests simple and focused
- Test one endpoint per describe block

### ❌ DON'T:
- Test business logic in controller tests
- Mock the repository in controller tests
- Test database operations
- Test validation (pipes handle this)
- Make controller tests complex
- Test HTTP framework behavior (NestJS handles this)

---

## Running the Tests

```bash
# Run all tests
npm test

# Run only controller tests
npm test employees.controller.spec.ts

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

---

## Common Patterns

### Testing Async Controllers
```typescript
// Controllers are usually async
it('should return data', async () => {
  mockService.method.mockResolvedValue(data);
  const result = await controller.method();
  expect(result).toEqual(data);
});
```

### Testing Empty Results
```typescript
it('should return empty array', async () => {
  mockService.findAll.mockResolvedValue([]);
  const result = await controller.findAll();
  expect(result).toEqual([]);
  expect(result).toHaveLength(0);
});
```

### Testing Type Conversion
```typescript
// Controller: +id converts string to number
@Get(':id')
findOne(@Param('id') id: number) {
  return this.service.findOne(+id);
}

// Test: Pass number directly
it('should convert id to number', async () => {
  await controller.findOne(1);
  expect(mockService.findOne).toHaveBeenCalledWith(1);
});
```

---

## Integration vs Unit Tests

### Unit Tests (What We're Doing)
- Mock all dependencies
- Test controller in isolation
- Fast execution
- Focus on logic flow

### Integration Tests (E2E)
- Use real HTTP requests
- Test entire request pipeline
- Include guards, pipes, interceptors
- Use test database

```typescript
// e2e test example
describe('/employees (e2e)', () => {
  it('POST /employees should create employee', () => {
    return request(app.getHttpServer())
      .post('/employees')
      .send(createDto)
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toBe(createDto.name);
      });
  });
});
```

---

## Practice Exercises

1. **Add query parameter test**: Test filtering employees by department
2. **Add pagination test**: Test with `@Query()` for page and limit
3. **Add custom response test**: Test controller that transforms service response
4. **Add guard test**: Uncomment guards and test authorization
5. **Add validation test**: Test with invalid DTO data

---

## Additional Resources

- [NestJS Controllers Documentation](https://docs.nestjs.com/controllers)
- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Mock Functions](https://jestjs.io/docs/mock-functions)
- [NestJS Guards Testing](https://docs.nestjs.com/guards#testing)

---

## Summary Checklist

When writing controller tests, ensure you:

- ✅ Mock the service (direct dependency)
- ✅ Test each HTTP endpoint
- ✅ Verify correct service method is called
- ✅ Verify correct parameters are passed
- ✅ Test success and error scenarios
- ✅ Check return values match service responses
- ✅ Test exception propagation
- ✅ Use AAA pattern (Arrange-Act-Assert)
- ✅ Clean up mocks after each test

---

*Happy Testing! 🎯*
