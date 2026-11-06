/* eslint-disable @typescript-eslint/naming-convention */
// Contadores da tela Pendências (api/Evento/ContarPendencias). Cada um é igual ao TotalCount do ListarPendencias equivalente.
export interface PendenciasContagem {
    Abertas: number;
    Vencidas: number;
    Vencendo: number;
    Concluidas: number;
    Ignoradas: number;
}
