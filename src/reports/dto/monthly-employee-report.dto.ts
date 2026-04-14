import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MonthlyEmployeeReportDto {
  @IsString()
  @IsNotEmpty({ message: 'El carnet del empleado es obligatorio' })
  employeeCarnet: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'El año debe ser un número' })
  @IsNotEmpty({ message: 'El año es obligatorio' })
  year: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'El mes debe ser un número' })
  @IsNotEmpty({ message: 'El mes es obligatorio' })
  month: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
