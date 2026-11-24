/* eslint-disable @typescript-eslint/naming-convention */
// LancamentoModel da API (receita ou despesa do coordenador). LAN_DATA trafega "yyyy-MM-dd" (sem fuso).
// LAN_GASTO_FIXO_ID só vem na saída (lançamento criado por um gasto fixo); a API ignora o valor enviado.
export class Lancamento {
    Id?: string;
    LAN_TIPO: number;
    LAN_TITULO: string;
    LAN_VALOR: number;
    LAN_DATA: string;
    LAN_CATEGORIA: number;
    LAN_OBSERVACOES?: string | null;
    LAN_GASTO_FIXO_ID?: string | null;
}
