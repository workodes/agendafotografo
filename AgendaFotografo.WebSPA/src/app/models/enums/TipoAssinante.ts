/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/TipoAssinante.cs. Os valores numéricos fazem parte do contrato com a API.
export enum TipoAssinante {
    Coordenador = 1,
    Fotografo = 2,
}

export const TIPO_ASSINANTE_ROTULO: Record<number, string> = {
    [TipoAssinante.Coordenador]: 'Coordenador',
    [TipoAssinante.Fotografo]: 'Fotógrafo',
};
