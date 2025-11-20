import { IsNotEmpty, IsEmail, Min, IsDateString, Matches } from "class-validator";

export class CreateEmployeeDto {
    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @Min(1)
    salary: number;

    @IsDateString()
    dateOfBirth: string;

    @Matches(/^\d{10}$/, { message: 'Mobile number must be 10 digits' })
    mobileNumber: number

    @IsNotEmpty()
    departmentId: number;
}
