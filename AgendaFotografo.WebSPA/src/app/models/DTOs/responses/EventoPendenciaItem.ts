/* eslint-disable @typescript-eslint/naming-convention */
// Pendência de um evento (ficha e lista geral). Vencida/Vencendo são calculadas pela API (o front não repete a regra).
// MEM_NOME e MEM_ATIVO são null sem responsável. EVP_PRAZO e EVE_DATA trafegam "yyyy-MM-dd".
export class EventoPendenciaItem {
    Id: string;
    EVP_EVENTO_ID: string;
    EVP_TITULO: string;
    EVP_CATEGORIA: number;
    EVP_PRIORIDADE: number;
    EVP_STATUS: number;
    EVP_MEMBRO_ID?: string | null;
    EVP_PRAZO?: string | null;
    EVP_OBSERVACOES?: string | null;
    // Preenchido (só pelo servidor) quando a pendência veio do checklist padrão: mostra a etiqueta "Padrão".
    EVP_MODELO_ID?: string | null;
    MEM_NOME?: string | null;
    MEM_ATIVO?: boolean | null;
    EVE_NOME: string;
    EVE_DATA: string;
    EVE_STATUS: number;
    Vencida: boolean;
    Vencendo: boolean;
}
