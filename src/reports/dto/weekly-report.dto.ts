import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  Matches,
} from 'class-validator';

export class WeeklyReportDto {
  @IsString()
  @IsNotEmpty({ message: 'El carnet del empleado es obligatorio' })
  employeeCarnet: string;

  @IsDateString({}, { message: 'Formato de fecha inválido. Use YYYY-MM-DD' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe estar en formato YYYY-MM-DD',
  })
  weekStartDate: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
