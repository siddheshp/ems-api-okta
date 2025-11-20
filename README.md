<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

Employee Management System API with TypeORM and Oracle database.

## Project setup

```bash
$ npm install
```

## Adding Okta Authentication - Step by Step

### Step 1: Install Required Dependencies

```bash
npm install @okta/jwt-verifier @nestjs/config
```

### Step 2: Create Environment Configuration File

Create a `.env` file in the root directory:

```env
OKTA_ISSUER=https://your-okta-domain.okta.com/oauth2/default
OKTA_CLIENT_ID=your_client_id
OKTA_AUDIENCE=api://default
```

### Step 3: Create Okta Authentication Guard

Create `src/auth/okta-auth.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OktaJwtVerifier from '@okta/jwt-verifier';

@Injectable()
export class OktaAuthGuard implements CanActivate {
  private oktaVerifier: OktaJwtVerifier;

  constructor(private configService: ConfigService) {
    const issuer = this.configService.get<string>('OKTA_ISSUER');
    const clientId = this.configService.get<string>('OKTA_CLIENT_ID');

    if (!issuer || !clientId) {
      throw new Error('Okta configuration is missing. Please set OKTA_ISSUER and OKTA_CLIENT_ID in .env file');
    }

    this.oktaVerifier = new OktaJwtVerifier({
      issuer,
      clientId,
      assertClaims: {
        aud: this.configService.get<string>('OKTA_AUDIENCE', 'api://default'),
      },
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No authorization header found');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const jwt = await this.oktaVerifier.verifyAccessToken(token, 'api://default');
      
      request.user = {
        sub: jwt.claims.sub,
        email: jwt.claims.email,
        groups: jwt.claims.groups || [],
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(`Token verification failed: ${error.message}`);
    }
  }
}
```

### Step 4: Create Admin Role Guard

Create `src/auth/admin.guard.ts`:

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User information not found. Please ensure authentication guard runs first.');
    }

    const groups = user.groups || [];
    const isAdmin = groups.includes('admin');

    if (!isAdmin) {
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    return true;
  }
}
```

### Step 5: Create Auth Module

Create `src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OktaAuthGuard } from './okta-auth.guard';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [ConfigModule],
  providers: [OktaAuthGuard, AdminGuard],
  exports: [OktaAuthGuard, AdminGuard],
})
export class AuthModule {}
```

### Step 6: Update App Module

Update `src/app.module.ts` to import ConfigModule and AuthModule:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    // ... other modules
  ],
  // ... controllers and providers
})
export class AppModule {}
```

### Step 7: Update Employees Module

Update `src/employees/employees.module.ts` to import AuthModule:

```typescript
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
// ... other imports

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    AuthModule,
  ],
  // ... controllers and providers
})
export class EmployeesModule {}
```

### Step 8: Apply Guards to Employee Controller

Update `src/employees/employees.controller.ts` to protect the POST endpoint:

```typescript
import { Controller, Post, UseGuards, Body } from '@nestjs/common';
import { OktaAuthGuard } from '../auth/okta-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
// ... other imports

@Controller('employees')
export class EmployeesController {
  
  @Post()
  @UseGuards(OktaAuthGuard, AdminGuard)
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return await this.employeesService.create(createEmployeeDto);
  }
  
  // ... other endpoints
}
```

### Step 9: Test the Implementation

Start the application:

```bash
npm run start:dev
```

Test with an authenticated request:

```bash
curl -X POST http://localhost:3000/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OKTA_JWT_TOKEN" \
  -d '{"name":"John Doe","email":"john@example.com","departmentId":1}'
```

**Expected Behaviors:**
- Without token: `401 Unauthorized`
- With token but not admin: `403 Forbidden`
- With token and admin role: Successfully creates employee

---

## Original NestJS Documentation

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## API Endpoints

### Employees
- `GET /employees` - Get all employees (public)
- `GET /employees/:id` - Get employee by ID (public)
- `POST /employees` - Create new employee (**requires admin role**)
- `PATCH /employees/:id` - Update employee (public)
- `DELETE /employees/:id` - Delete employee (public)

### Departments
- Standard CRUD operations available

## Authentication & Authorization

This API uses **Okta JWT authentication** with role-based access control:

- The `POST /employees` endpoint requires authentication with a valid Okta JWT token
- The user must be part of the **'admin' group** in Okta to create employees
- Include the JWT token in the Authorization header: `Bearer <your-token>`

### Making Authenticated Requests

```bash
curl -X POST http://localhost:3000/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_OKTA_JWT_TOKEN" \
  -d '{"name":"John Doe","email":"john@example.com","departmentId":1}'
```

### Error Responses

- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - User is not in the admin group

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
