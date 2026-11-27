/* eslint-disable @typescript-eslint/naming-convention */
export class AssinanteListItem {
    Id: string;
    ASS_NOME: string;
    ASS_EMAIL: string;
    ASS_TELEFONE?: string | null;
    ASS_CPF_CNPJ?: string | null;
    ASS_ATIVO: boolean;
    ExigirTrocaSenha: boolean;
    LastLogin?: string | null;
    ASS_TESTE_ATE?: string | null;
    ASS_ORIGEM: number;
    /** TipoAssinante (plano 24): 1 = com plano, 2 = Gratuito. */
    ASS_TIPO: number;
    /** Plano 24: null no Gratuito. */
    ASS_PLANO_ID?: string | null;
    /** Plano 24: nome do plano (null = Gratuito). */
    PlanoNome?: string | null;
    TesteDiasRestantes?: number | null;
}
