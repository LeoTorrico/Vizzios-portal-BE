import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class MonthlyReportDto {
  @Type(() => Number)
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(2024, { message: 'El año debe ser 2024 o posterior' })
  @Max(2030, { message: 'El año no puede ser mayor a 2030' })
  year: number;

  @Type(() => Number)
  @IsInt({ message: 'El mes debe ser un número entero' })
  @Min(1, { message: 'El mes debe estar entre 1 y 12' })
  @Max(12, { message: 'El mes debe estar entre 1 y 12' })
  month: number;

  @IsOptional()
  @IsString()
  branchId?: string;
}
