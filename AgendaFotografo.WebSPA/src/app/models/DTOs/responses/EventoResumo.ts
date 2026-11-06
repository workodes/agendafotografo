/* eslint-disable @typescript-eslint/naming-convention */
// Resumo de um evento (usado nos alertas de conflito "Também em: ...").
export class EventoResumo {
    Id: string;
    EVE_NOME: string;
    EVE_DATA: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_LOCAL?: string | null;
    EVE_STATUS: number;
}
