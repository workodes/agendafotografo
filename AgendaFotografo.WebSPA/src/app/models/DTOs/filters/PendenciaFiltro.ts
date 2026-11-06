// Filtros de api/Evento/ListarPendencias. status = abertas | todas | 1 | 2 | 3; prazo = todos | vencidas | vencendo | vencidasOuVencendo.
// Só vão na query quando preenchidos (vazio = padrão da API: abertas).
export interface PendenciaFiltro {
    status?: string | null;
    prioridade?: number | null;
    membroId?: string | null;
    prazo?: string | null;
}
