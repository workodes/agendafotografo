/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.WebApi/Models/Avisos/GravidadeAviso.cs. Os valores numéricos fazem parte do contrato com a API.
export enum GravidadeAviso {
    Critico = 1,
    Atencao = 2,
}

export const GRAVIDADE_AVISO_ROTULO: Record<number, string> = {
    [GravidadeAviso.Critico]: 'Críticos',
    [GravidadeAviso.Atencao]: 'Atenção',
};
