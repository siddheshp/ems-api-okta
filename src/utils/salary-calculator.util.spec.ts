import { calculateAnnualSalary } from "./salary-calculator.util";


describe('Salary tests', () => {
    it('should calculate annual salary correctly', () => {
        // Arrange
        const monthly = 50000;

        // Act
        const annual = calculateAnnualSalary(monthly);

        // Assert
        expect(annual).toBe(600000);
    });

    it('should throw error for negative salary', () => {
        expect(() => calculateAnnualSalary(-100)).toThrow('Invalid salary');
    });
})