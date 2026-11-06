/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/StatusPendencia.cs. Os valores numéricos fazem parte do contrato com a API.
export enum StatusPendencia {
    AFazer = 1,
    EmAndamento = 2,
    Concluida = 3,
    // Estado final reversível: não é "aberta" (não conta, não vence, não entra em avisos). Restaurar volta para A fazer.
    Ignorada = 4,
}

export const STATUS_PENDENCIA_ROTULO: Record<number, string> = {
    [StatusPendencia.AFazer]: 'A fazer',
    [StatusPendencia.EmAndamento]: 'Em andamento',
    [StatusPendencia.Concluida]: 'Concluída',
    [StatusPendencia.Ignorada]: 'Ignorada',
};

// Classes (Tailwind) do chip de status. Escritas por extenso para o Tailwind enxergar.
export const STATUS_PENDENCIA_COR: Record<number, string> = {
    [StatusPendencia.AFazer]: 'bg-gray-200 text-gray-700',
    [StatusPendencia.EmAndamento]: 'bg-blue-100 text-blue-800',
    [StatusPendencia.Concluida]: 'bg-green-100 text-green-800',
    [StatusPendencia.Ignorada]: 'bg-gray-100 text-gray-500',
};

// Lista para o select de status (os 4 valores).
export const STATUS_PENDENCIA: { valor: number; rotulo: string }[] = [
    StatusPendencia.AFazer, StatusPendencia.EmAndamento, StatusPendencia.Concluida, StatusPendencia.Ignorada,
].map(valor => ({ valor, rotulo: STATUS_PENDENCIA_ROTULO[valor] }));
