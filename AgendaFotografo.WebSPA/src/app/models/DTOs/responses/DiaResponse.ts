/* eslint-disable @typescript-eslint/naming-convention */
import { EventoResumo } from './EventoResumo';

export class DiaEquipeItem {
    Id: string; // Id da linha da escala
    EVM_MEMBRO_ID: string;
    EVM_POSICAO?: string | null;
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    MEM_ATIVO: boolean;
    EmConflito: boolean;
}

export class DiaEventoItem {
    Id: string;
    EVE_NOME: string;
    EVE_TIPO_EVENTO_ID: string;
    TipoEventoNome: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_LOCAL?: string | null;
    EVE_STATUS: number;
    EVE_ORGANIZADOR_ID?: string | null;
    OrganizadorNome?: string | null;
    Equipe: DiaEquipeItem[];
    PendenciasAbertas: number;
    PendenciasTotal: number;
}

export class DiaMembroLivreItem {
    Id: string; // Id do membro
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
}

export class DiaConflitoItem {
    Id: string; // Id do membro
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    MEM_ATIVO: boolean;
    Eventos: EventoResumo[];
}

// Resposta de api/Evento/Dia?data=yyyy-MM-dd.
export class DiaResponse {
    Data: string;
    Eventos: DiaEventoItem[];
    Livres: DiaMembroLivreItem[];
    Conflitos: DiaConflitoItem[];
}
