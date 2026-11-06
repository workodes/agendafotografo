/* eslint-disable @typescript-eslint/naming-convention */
// Linha da lista do checklist padrão. TPE_NOME null = "Todos os tipos".
export class PendenciaModeloListItem {
    Id: string;
    PEM_TITULO: string;
    PEM_CATEGORIA: number;
    PEM_PRIORIDADE: number;
    PEM_DIAS_ANTES?: number | null;
    PEM_TIPO_EVENTO_ID?: string | null;
    PEM_ATIVO: boolean;
    TPE_NOME?: string | null;
    TPE_ATIVO?: boolean | null;
}
