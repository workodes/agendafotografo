// Filtros de api/Evento/ListarPendencias. status = abertas | todas (inclui ignoradas) | 1 | 2 | 3 | 4; prazo = todos | vencidas | vencendo | vencidasOuVencendo.
// Só vão na query quando preenchidos (vazio = padrão da API: abertas).
export interface PendenciaFiltro {
    status?: string | null;
    prioridade?: number | null;
    membroId?: string | null;
    prazo?: string | null;
}
