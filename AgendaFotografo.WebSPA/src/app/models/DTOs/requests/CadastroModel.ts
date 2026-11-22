/* eslint-disable @typescript-eslint/naming-convention */
// CadastroModel da API (POST Auth/Cadastrar). Telefone e CPF/CNPJ só com dígitos.
export class CadastroModel {
    ASS_NOME: string;
    ASS_EMAIL: string;
    ASS_TELEFONE: string;
    ASS_CPF_CNPJ: string;
    Senha: string;
    /** TipoAssinante: 1 Coordenador, 2 Fotografo (com 2, ASS_CPF_CNPJ precisa ser CPF). */
    ASS_TIPO: number;
}
