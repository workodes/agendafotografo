/* eslint-disable @typescript-eslint/naming-convention */
// CadastroModel da API (POST Auth/Cadastrar). Telefone e CPF/CNPJ só com dígitos.
export class CadastroModel {
    ASS_NOME: string;
    ASS_EMAIL: string;
    ASS_TELEFONE: string;
    ASS_CPF_CNPJ: string;
    Senha: string;
}
