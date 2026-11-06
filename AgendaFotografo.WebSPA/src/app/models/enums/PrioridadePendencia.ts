/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/PrioridadePendencia.cs. Os valores numéricos fazem parte do contrato com a API.
export enum PrioridadePendencia {
    Alta = 1,
    Media = 2,
    Baixa = 3,
}

export const PRIORIDADE_PENDENCIA_ROTULO: Record<number, string> = {
    [PrioridadePendencia.Alta]: 'Alta',
    [PrioridadePendencia.Media]: 'Média',
    [PrioridadePendencia.Baixa]: 'Baixa',
};

// Classes (Tailwind) do chip de prioridade. Escritas por extenso para o Tailwind enxergar.
export const PRIORIDADE_PENDENCIA_COR: Record<number, string> = {
    [PrioridadePendencia.Alta]: 'bg-red-100 text-red-800',
    [PrioridadePendencia.Media]: 'bg-amber-100 text-amber-800',
    [PrioridadePendencia.Baixa]: 'bg-gray-200 text-gray-600',
};

// Lista para o select de prioridade.
export const PRIORIDADE_PENDENCIA: { valor: number; rotulo: string }[] = [
    PrioridadePendencia.Alta, PrioridadePendencia.Media, PrioridadePendencia.Baixa,
].map(valor => ({ valor, rotulo: PRIORIDADE_PENDENCIA_ROTULO[valor] }));
