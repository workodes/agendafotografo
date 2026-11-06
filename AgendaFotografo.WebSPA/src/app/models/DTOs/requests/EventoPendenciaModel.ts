/* eslint-disable @typescript-eslint/naming-convention */
// Corpo de api/Evento/AdicionarPendencia (sem Id) e AtualizarPendencia (com Id). EVP_PRAZO = "yyyy-MM-dd" ou null.
export class EventoPendenciaModel {
    Id?: string | null;
    EVP_EVENTO_ID: string;
    EVP_TITULO: string;
    EVP_CATEGORIA: number;
    EVP_PRIORIDADE: number;
    EVP_STATUS: number;
    EVP_MEMBRO_ID?: string | null;
    EVP_PRAZO?: string | null;
    EVP_OBSERVACOES?: string | null;
}

// Corpo de api/Evento/AtualizarStatusPendencia.
export class EventoPendenciaStatusModel {
    EVP_STATUS: number;
}
