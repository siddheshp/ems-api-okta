# NestJS Guard Testing Guide

This guide explains how to unit test NestJS guards for **authentication** and **authorization**.

## Why Test Guards Separately?

✅ **Single Responsibility**: Each test focuses on one security concern  
✅ **Faster Execution**: No need to set up entire request pipeline  
✅ **Clear Failures**: Easy to identify security vs. business logic issues  
✅ **Reusability**: Guards tested once, used across multiple controllers  

---

## Understanding Guards

A guard implements the `CanActivate` interface and returns `true` (allow) or throws an exception (deny).

**Guard Responsibilities:**
- **Authentication**: Verify user identity (OktaAuthGuard)
- **Authorization**: Verify user permissions (AdminGuard)

---

## Testing Strategy

| Test Type | What to Test | Mock Guards? |
|-----------|-------------|--------------|
| **Unit - Guards** | Authorization logic | ❌ No |
| **Unit - Controllers** | Business logic | ✅ Yes |
| **E2E** | Complete flow | ❌ No |

---

## OktaAuthGuard Testing

### File: `okta-auth.guard.spec.ts`

### Test Setup with ConfigService

```typescript
describe('OktaAuthGuard', () => {
  let guard: OktaAuthGuard;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, string> = {
          'OKTA_ISSUER': 'https://dev-12345.okta.com/oauth2/default',
          'OKTA_CLIENT_ID': 'test-client-id',
          'OKTA_AUDIENCE': 'api://default',
        };
        return config[key] || defaultValue;
      }),
    } as any;

    guard = new OktaAuthGuard(mockConfigService);
  });
```

**Key points:**
- Mock `ConfigService` to provide Okta configuration
- Guard needs issuer, client ID, and audience for JWT verification

### Mock ExecutionContext

```typescript
const createMockExecutionContext = (headers: Record<string, string>): ExecutionContext => {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        headers,
      }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
};
```

**Why mock ExecutionContext?**
- Guards receive `ExecutionContext`, not raw request
- `switchToHttp()` accesses HTTP-specific request
- `getRequest()` returns mock request with headers

### Testing Valid Token

```typescript
it('should return true for valid Bearer token', async () => {
  const mockContext = createMockExecutionContext({
    authorization: 'Bearer valid-okta-token-12345',
  });

  const result = await guard.canActivate(mockContext);

  expect(result).toBe(true);
});
```

### Testing Missing Authorization

```typescript
it('should throw UnauthorizedException when authorization header is missing', async () => {
  const mockContext = createMockExecutionContext({});

  await expect(guard.canActivate(mockContext)).rejects.toThrow(
    UnauthorizedException,
  );
});
```

### Testing Edge Cases

```typescript
it('should throw UnauthorizedException for invalid token format', async () => {
  const mockContext = createMockExecutionContext({
    authorization: 'invalid-token-format', // No "Bearer" prefix
  });

  await expect(guard.canActivate(mockContext)).rejects.toThrow(
    UnauthorizedException,
  );
});

it('should throw UnauthorizedException for empty Bearer token', async () => {
  const mockContext = createMockExecutionContext({
    authorization: 'Bearer ',
  });

  await expect(guard.canActivate(mockContext)).rejects.toThrow(
    UnauthorizedException,
  );
});
```

**Why test edge cases?**
- Prevents security bypasses
- Ensures robust validation
- Handles malformed inputs

---

## AdminGuard Testing

### File: `admin.guard.spec.ts`

### Test Setup

```typescript
describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });
```

### Mock Context with User

```typescript
const createMockExecutionContext = (user: any): ExecutionContext => {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({
        user,  // User object attached by OktaAuthGuard
      }),
      getResponse: jest.fn(),
      getNext: jest.fn(),
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn(),
  } as unknown as ExecutionContext;
};
```

**Key difference from OktaAuthGuard:**
- Reads `user` object (not `headers`)
- Runs AFTER OktaAuthGuard sets user

### Testing Admin Access

```typescript
it('should return true for user with admin in groups', () => {
  const mockContext = createMockExecutionContext({
    id: 1,
    email: 'admin@test.com',
    groups: ['admin', 'users'],
  });

  const result = guard.canActivate(mockContext);

  expect(result).toBe(true);
});
```

**Note:** AdminGuard checks `groups` array, not `role` property.

### Testing Non-Admin Users

```typescript
it('should throw ForbiddenException for user without admin in groups', () => {
  const mockContext = createMockExecutionContext({
    id: 2,
    email: 'user@test.com',
    groups: ['users'],
  });

  expect(() => guard.canActivate(mockContext)).toThrow(
    ForbiddenException,
  );
});
```

**Exception Types:**
- `UnauthorizedException` (401): Authentication failure
- `ForbiddenException` (403): Authorization failure

### Testing Missing User

```typescript
it('should throw ForbiddenException when user is undefined', () => {
  const mockContext = createMockExecutionContext(undefined);

  expect(() => guard.canActivate(mockContext)).toThrow(
    ForbiddenException,
  );
});

it('should throw ForbiddenException when user has no groups property', () => {
  const mockContext = createMockExecutionContext({
    id: 3,
    email: 'nogroups@test.com',
  });

  expect(() => guard.canActivate(mockContext)).toThrow(
    ForbiddenException,
  );
});
```

### Testing Case Sensitivity

```typescript
it('should be case-sensitive for admin group check', () => {
  const mockContext = createMockExecutionContext({
    groups: ['Admin'], // uppercase A
  });

  // 'Admin' !== 'admin', should fail
  expect(() => guard.canActivate(mockContext)).toThrow(
    ForbiddenException,
  );
});
```

---

## Testing Controllers with Guards

### Override Guards in Controller Tests

```typescript
describe('EmployeesController - with Guards', () => {
  let controller: EmployeesController;
  let service: EmployeesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        {
          provide: EmployeesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(OktaAuthGuard)
      .useValue({ canActivate: () => true })  // Always allow
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })  // Always allow
      .compile();

    controller = module.get<EmployeesController>(EmployeesController);
    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should call service.create when guards pass', async () => {
    const createDto = { name: 'Test', email: 'test@test.com', ... };
    jest.spyOn(service, 'create').mockResolvedValue({ id: 1, ...createDto } as any);

    await controller.create(createDto);

    expect(service.create).toHaveBeenCalledWith(createDto);
  });
});
```

**Why override guards?**
- Controller tests focus on business logic
- Guard logic already tested in guard specs
- Makes tests faster and simpler

---

## Best Practices

### ✅ DO

1. **Test guards in isolation**
   ```typescript
   describe('MyGuard', () => {
     let guard: MyGuard;
     beforeEach(() => {
       guard = new MyGuard(); // Direct instantiation
     });
   });
   ```

2. **Test all edge cases**
   - Missing data
   - Invalid formats
   - Null/undefined values
   - Empty strings/arrays

3. **Use correct exception types**
   ```typescript
   // Authentication failure
   throw new UnauthorizedException();  // 401
   
   // Authorization failure
   throw new ForbiddenException();  // 403
   ```

4. **Mock ExecutionContext properly**
   - Use `jest.fn().mockReturnValue()` for method chains
   - Cast as `unknown as ExecutionContext` for type safety

5. **Mock dependencies**
   - ConfigService for guards needing configuration
   - Any external services

### ❌ DON'T

1. **Don't test guards in controller unit tests**
   ```typescript
   // BAD - Testing guard logic in controller test
   it('should block non-admin users', () => { ... });
   
   // GOOD - Override guards in controller tests
   .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
   ```

2. **Don't skip edge cases**
   - Always test failure scenarios
   - Test malformed inputs
   - Test missing/null values

3. **Don't use async for synchronous guards**
   ```typescript
   // BAD - AdminGuard.canActivate is synchronous
   await expect(guard.canActivate(context)).rejects.toThrow(...);
   
   // GOOD
   expect(() => guard.canActivate(context)).toThrow(...);
   ```

---

## Common Patterns

### Pattern 1: Testing Multiple Roles/Groups

```typescript
const allowedGroups = ['admin', 'superadmin', 'moderator'];

allowedGroups.forEach(group => {
  it(`should allow access for ${group} group`, () => {
    const mockContext = createMockExecutionContext({
      user: { groups: [group] },
    });
    
    const result = guard.canActivate(mockContext);
    expect(result).toBe(true);
  });
});
```

### Pattern 2: Async vs Sync Guards

```typescript
// Async guard (OktaAuthGuard)
await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);

// Sync guard (AdminGuard)
expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
```

### Pattern 3: Testing with ConfigService

```typescript
mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config: Record<string, string> = {
      'API_KEY': 'test-key',
      'FEATURE_FLAG': 'true',
    };
    return config[key] || defaultValue;
  }),
} as any;
```

---

## Running Tests

```bash
# Run guard tests
npm test okta-auth.guard.spec.ts
npm test admin.guard.spec.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## Key Takeaways

1. **Test guards separately** from controllers
2. **Mock ExecutionContext** to simulate requests  
3. **Mock ConfigService** for guards needing configuration
4. **Test both success and failure** scenarios
5. **Use correct exception types** (401 vs 403)
6. **Override guards in controller tests** to focus on business logic
7. **AdminGuard checks `groups` array**, not `role` property
8. **OktaAuthGuard is async**, AdminGuard is synchronous

---

*Guards are your application's security layer. Test them thoroughly! 🔒*

### Why Test Guards Separately?

✅ **Single Responsibility**: Each test focuses on one security concern  
✅ **Faster Execution**: No need to set up entire request pipeline  
✅ **Clear Failures**: Easy to identify security vs. business logic issues  
✅ **Reusability**: Guards tested once, used across multiple controllers  

---

## Understanding Guards in NestJS

### What is a Guard?

A guard is a class that implements the `CanActivate` interface:

```typescript
export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}