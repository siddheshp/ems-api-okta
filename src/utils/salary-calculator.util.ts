import { error } from "console";

export function calculateAnnualSalary(monthlySalary: number): number{
    if(monthlySalary <0)
        throw new Error('Invalid salary');
    return monthlySalary *12;
}