/* eslint-disable @typescript-eslint/naming-convention */
export class EventoPessoalListItem {
    Id: string;
    EPS_NOME: string;
    EPS_DATA: string;
    EPS_HORA?: string | null;
    EPS_CIDADE: string;
    EPS_LOCAL?: string | null;
    /** StatusEvento: 1 Pendente, 2 Confirmado, 3 Realizado, 4 Cancelado. */
    EPS_STATUS: number;
}
