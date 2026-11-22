/* eslint-disable @typescript-eslint/naming-convention */
// EventoPessoalModel da API (agenda pessoal do Fotógrafo). EPS_DATA "yyyy-MM-dd"; EPS_HORA "HH:mm:ss" ou null ("a confirmar").
export class EventoPessoal {
    Id?: string;
    EPS_NOME: string;
    EPS_DATA: string;
    EPS_HORA?: string | null;
    EPS_CIDADE: string;
    EPS_LOCAL?: string | null;
    EPS_STATUS: number;
    EPS_LINK?: string | null;
    EPS_OBSERVACOES?: string | null;
}
