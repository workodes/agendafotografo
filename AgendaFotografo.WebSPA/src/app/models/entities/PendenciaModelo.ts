/* eslint-disable @typescript-eslint/naming-convention */
// PendenciaModeloModel da API (item do checklist padrão do assinante).
// PEM_DIAS_ANTES: positivo = dias antes do evento, negativo = depois, null = sem prazo (faixa -90 a 365).
// PEM_TIPO_EVENTO_ID null = vale para todos os tipos. PEM_ATIVO só vem na saída (muda por Inativar/Ativar).
export class PendenciaModelo {
    Id?: string;
    PEM_TITULO: string;
    PEM_CATEGORIA: number;
    PEM_PRIORIDADE: number;
    PEM_DIAS_ANTES?: number | null;
    PEM_TIPO_EVENTO_ID?: string | null;
    PEM_ATIVO?: boolean;
}
