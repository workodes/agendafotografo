/* eslint-disable @typescript-eslint/naming-convention */
// CadastroGoogleModel da API (POST Auth/CadastrarGoogle). O e-mail vem do token, nunca do body.
export class CadastroGoogleModel {
    IdToken: string;
    ASS_NOME: string;
    ASS_TELEFONE: string;
    ASS_CPF_CNPJ: string;
    /** TipoAssinante: 1 Coordenador, 2 Fotografo. */
    ASS_TIPO: number;
}
