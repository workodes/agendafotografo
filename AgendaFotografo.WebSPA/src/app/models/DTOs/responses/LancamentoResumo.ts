/* eslint-disable @typescript-eslint/naming-convention */
// LancamentoResumoResponse: totais do período e da busca (a lista inteira, não só a página). Saldo = Receitas - Despesas.
export interface LancamentoResumo {
    Receitas: number;
    Despesas: number;
    Saldo: number;
    Quantidade: number;
}
