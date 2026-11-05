/* eslint-disable @typescript-eslint/naming-convention */
// AssinanteModel da API. Entrada: Id, ASS_NOME, ASS_CPF_CNPJ, ASS_EMAIL, ASS_TELEFONE.
// Só saída: ASS_ATIVO, ExigirTrocaSenha, LastLogin, CreatedAt (a API ignora na entrada).
export class Assinante {
    Id?: string;
    ASS_NOME: string;
    ASS_CPF_CNPJ?: string | null;
    ASS_EMAIL: string;
    ASS_TELEFONE?: string | null;
    ASS_ATIVO?: boolean;
    ExigirTrocaSenha?: boolean;
    LastLogin?: string | null;
    CreatedAt?: string;
}
