// Filtros de api/Evento/Agenda. dataDe e dataAte ("yyyy-MM-dd", inclusivas) são obrigatórias, no máximo 62 dias;
// status é o enum StatusEvento (1 a 4). Os demais são opcionais.
export interface AgendaFiltro {
    dataDe: string;
    dataAte: string;
    status?: number | null;
    tipoEventoId?: string | null;
    cidade?: string | null;
    membroId?: string | null;
}
