/* eslint-disable @typescript-eslint/naming-convention */
export class EventoListItemEquipe {
    Id: string; // Id do membro
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
}

export class EventoListItem {
    Id: string;
    EVE_NOME: string;
    EVE_TIPO_EVENTO_ID: string;
    TipoEventoNome: string;
    EVE_DATA: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_LOCAL?: string | null;
    EVE_STATUS: number;
    EVE_ORGANIZADOR_ID?: string | null;
    OrganizadorNome?: string | null;
    Equipe: EventoListItemEquipe[];
    PendenciasAbertas: number;
    PendenciasTotal: number;
}
