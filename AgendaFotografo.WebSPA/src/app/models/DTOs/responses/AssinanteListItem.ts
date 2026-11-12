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
    TesteDiasRestantes?: number | null;
}
