import { IsNotEmpty, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateVacationDto {
    @IsNotEmpty()
    @IsString()
    employeeCarnet: string;

    @IsNotEmpty()
    @IsDateString()
    startDate: string;

    @IsNotEmpty()
    @IsDateString()
    endDate: string;

    @IsOptional()
    @IsString()
    reason?: string;
}
