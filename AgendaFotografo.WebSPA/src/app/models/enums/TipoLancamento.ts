/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/TipoLancamento.cs. Os valores numéricos fazem parte do contrato com a API.
export enum TipoLancamento {
    Receita = 1,
    Despesa = 2,
}

export const TIPO_LANCAMENTO_ROTULO: Record<number, string> = {
    [TipoLancamento.Receita]: 'Receita',
    [TipoLancamento.Despesa]: 'Despesa',
};

// Lista para o seletor de tipo do lançamento.
export const TIPO_LANCAMENTO: { valor: number; rotulo: string }[] = [
    TipoLancamento.Receita, TipoLancamento.Despesa,
].map(valor => ({ valor, rotulo: TIPO_LANCAMENTO_ROTULO[valor] }));
