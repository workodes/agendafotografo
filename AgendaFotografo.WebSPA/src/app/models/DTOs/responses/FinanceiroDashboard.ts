/* eslint-disable @typescript-eslint/naming-convention */
// FinanceiroDashboardResponse (api/Dashboard/Financeiro). Sem lançamentos no período: DataDe/DataAte nulas e Serie vazia
// (tratar o vazio por Serie.length === 0). PorDia = true quando o período tem até 31 dias (baldes por dia); false = por mês.
export interface FinanceiroCategoriaItem {
    Categoria: number;
    Total: number;
}

export interface FinanceiroSerieItem {
    /** "yyyy-MM-dd": o dia, ou o dia 1 do mês quando PorDia é false. */
    Periodo: string;
    Receitas: number;
    Despesas: number;
    SaldoAcumulado: number;
}

export interface FinanceiroDashboard {
    DataDe: string | null;
    DataAte: string | null;
    PorDia: boolean;
    TotalReceitas: number;
    TotalDespesas: number;
    Saldo: number;
    PorCategoria: FinanceiroCategoriaItem[];
    Serie: FinanceiroSerieItem[];
}
