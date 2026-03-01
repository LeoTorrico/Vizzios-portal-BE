export interface DayDetail {
  fecha: string;
  diaSemana: string;
  entrada: string | null;
  salida: string | null;
  horas: number;
  incompleto: boolean;
  status: 'TRABAJADO' | 'VACACIONES' | 'AUSENCIA' | 'INCOMPLETO';
}

export interface WeeklyReportResponse {
  employee: {
    carnet: string;
    firstName: string;
    lastName: string;
  };
  week: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalHoras: number;
    promedioDiario: number;
    diasTrabajados: number;
  };
  desglose: DayDetail[];
}
