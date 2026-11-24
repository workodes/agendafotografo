/* eslint-disable @typescript-eslint/naming-convention */
// Item da lista de lançamentos (sem observações). LAN_GASTO_FIXO_ID preenchido = veio de um gasto fixo (selo "Fixo").
export interface LancamentoListItem {
    Id: string;
    LAN_TIPO: number;
    LAN_TITULO: string;
    LAN_VALOR: number;
    LAN_DATA: string;
    LAN_CATEGORIA: number;
    LAN_GASTO_FIXO_ID: string | null;
}
