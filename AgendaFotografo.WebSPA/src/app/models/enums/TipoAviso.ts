/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.WebApi/Models/Avisos/TipoAviso.cs. Os valores numéricos fazem parte do contrato com a API.
export enum TipoAviso {
    PendenciasVencidas = 1,
    PendenciasVencendo = 2,
    EventoProximo = 3,
    ConflitoEscala = 4,
    EventosPassadosSemBaixa = 5,
}
