/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/RecorrenciaPlano.cs (plano 24). Os valores numéricos fazem parte do contrato com a API.
export enum RecorrenciaPlano {
    Mensal = 1,
    Anual = 2,
}

export const RECORRENCIA_PLANO_ROTULO: Record<number, string> = {
    [RecorrenciaPlano.Mensal]: 'Mensal',
    [RecorrenciaPlano.Anual]: 'Anual',
};

// Sufixo do valor na lista ("R$ 49,90/mês").
export const RECORRENCIA_PLANO_SUFIXO: Record<number, string> = {
    [RecorrenciaPlano.Mensal]: '/mês',
    [RecorrenciaPlano.Anual]: '/ano',
};

export const RECORRENCIA_PLANO: { valor: number; rotulo: string }[] = [RecorrenciaPlano.Mensal, RecorrenciaPlano.Anual]
    .map(valor => ({ valor, rotulo: RECORRENCIA_PLANO_ROTULO[valor] }));
