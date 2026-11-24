/* eslint-disable @typescript-eslint/naming-convention */
// GastoFixoModel da API. GAF_DIA de 1 a 31. GAF_ATIVO só vem na saída (muda por Inativar/Ativar).
// GAF_GERADO_ATE nunca sai da API.
export class GastoFixo {
    Id?: string;
    GAF_TITULO: string;
    GAF_VALOR: number;
    GAF_CATEGORIA: number;
    GAF_DIA: number;
    GAF_ATIVO?: boolean;
}
