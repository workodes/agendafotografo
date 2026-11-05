/* eslint-disable @typescript-eslint/naming-convention */
// OrganizadorModel da API. ORG_INSTAGRAM trafega sem "@"; ORG_TELEFONE só com dígitos.
// ORG_EMAIL é opcional (até 200 caracteres; a API devolve em minúsculas). ORG_ATIVO só vem na saída (o status muda por Inativar/Ativar).
export class Organizador {
    Id?: string;
    ORG_NOME: string;
    ORG_CONTATO?: string | null;
    ORG_EMAIL?: string | null;
    ORG_TELEFONE?: string | null;
    ORG_INSTAGRAM?: string | null;
    ORG_NOTAS?: string | null;
    ORG_ATIVO?: boolean;
}
