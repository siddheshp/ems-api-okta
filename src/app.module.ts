import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './employees/entities/employee.entity';
import { Department } from './departments/entities/department.entity';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EmployeesModule,
    DepartmentsModule,
    AuthModule,
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1521', 10),
      username: process.env.DB_USERNAME || 'training',
      password: process.env.DB_PASSWORD || 'training123',
      serviceName: process.env.DB_SERVICE_NAME || 'XEPDB1',
      entities: [Employee, Department],
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
