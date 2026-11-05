// Filtros de api/Evento/Listar. Datas "yyyy-MM-dd"; status é o enum StatusEvento; ordem "asc" (padrão) ou "desc".
export interface EventoFiltro {
    busca?: string;
    dataDe?: string | null;
    dataAte?: string | null;
    status?: number | null;
    tipoEventoId?: string | null;
    organizadorId?: string | null;
    ordem?: 'asc' | 'desc';
}
