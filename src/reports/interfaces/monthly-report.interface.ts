export interface TopEmployee {
  carnet: string;
  nombre: string;
  horas: number;
  diasVacacion?: number;
}

export interface BranchReport {
  branchId: string;
  branchName: string;
  totalHoras: number;
  empleadosActivos: number;
  promedioPorEmpleado: number;
  topEmpleados: TopEmployee[];
}

export interface MonthlyReportResponse {
  period: {
    year: number;
    month: number;
    monthName: string;
  };
  branches: BranchReport[];
}
