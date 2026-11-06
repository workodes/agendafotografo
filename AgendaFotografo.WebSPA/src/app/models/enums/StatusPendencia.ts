/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/StatusPendencia.cs. Os valores numéricos fazem parte do contrato com a API.
export enum StatusPendencia {
    AFazer = 1,
    EmAndamento = 2,
    Concluida = 3,
}

export const STATUS_PENDENCIA_ROTULO: Record<number, string> = {
    [StatusPendencia.AFazer]: 'A fazer',
    [StatusPendencia.EmAndamento]: 'Em andamento',
    [StatusPendencia.Concluida]: 'Concluída',
};

// Classes (Tailwind) do chip de status. Escritas por extenso para o Tailwind enxergar.
export const STATUS_PENDENCIA_COR: Record<number, string> = {
    [StatusPendencia.AFazer]: 'bg-gray-200 text-gray-700',
    [StatusPendencia.EmAndamento]: 'bg-blue-100 text-blue-800',
    [StatusPendencia.Concluida]: 'bg-green-100 text-green-800',
};

// Lista para o select de status.
export const STATUS_PENDENCIA: { valor: number; rotulo: string }[] = [
    StatusPendencia.AFazer, StatusPendencia.EmAndamento, StatusPendencia.Concluida,
].map(valor => ({ valor, rotulo: STATUS_PENDENCIA_ROTULO[valor] }));
