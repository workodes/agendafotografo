/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/StatusEvento.cs. Os valores numéricos fazem parte do contrato com a API.
export enum StatusEvento {
    Pendente = 1,
    Confirmado = 2,
    Realizado = 3,
    Cancelado = 4,
}

export const STATUS_EVENTO_ROTULO: Record<number, string> = {
    [StatusEvento.Pendente]: 'Pendente',
    [StatusEvento.Confirmado]: 'Confirmado',
    [StatusEvento.Realizado]: 'Realizado',
    [StatusEvento.Cancelado]: 'Cancelado',
};

// Classes (Tailwind) do chip de status. Escritas por extenso para o Tailwind enxergar.
export const STATUS_EVENTO_COR: Record<number, string> = {
    [StatusEvento.Pendente]: 'bg-amber-100 text-amber-800',
    [StatusEvento.Confirmado]: 'bg-green-100 text-green-800',
    [StatusEvento.Realizado]: 'bg-blue-100 text-blue-800',
    [StatusEvento.Cancelado]: 'bg-gray-200 text-gray-600',
};

// Lista para o select de status (ficha e filtro).
export const STATUS_EVENTO: { valor: number; rotulo: string }[] = [
    StatusEvento.Pendente, StatusEvento.Confirmado, StatusEvento.Realizado, StatusEvento.Cancelado,
].map(valor => ({ valor, rotulo: STATUS_EVENTO_ROTULO[valor] }));
