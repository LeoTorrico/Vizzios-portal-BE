import { DayDetail } from './weekly-report.interface';

export interface MonthlyEmployeeReportResponse {
  employee: {
    carnet: string;
    firstName: string;
    lastName: string;
  };
  period: {
    year: number;
    month: number;
    monthName: string;
  };
  summary: {
    totalHoras: number;
    promedioDiario: number;
    diasTrabajados: number;
  };
  desglose: DayDetail[];
}
