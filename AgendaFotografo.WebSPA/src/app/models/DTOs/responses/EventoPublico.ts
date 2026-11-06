/* eslint-disable @typescript-eslint/naming-convention */
export class EventoPublicoEquipeItem {
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    EVM_POSICAO?: string | null;
}

// Saída de api/LinkPublico/Evento (lista branca: sem Ids, organizador, notas internas nem link de inscrição).
// EVE_DATA "yyyy-MM-dd"; EVE_HORA "HH:mm:ss" ou null. Equipe é null quando o coordenador não liga "mostrar equipe".
export class EventoPublico {
    EVE_NOME: string;
    EVE_DATA: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_LOCAL?: string | null;
    Cancelado: boolean;
    EVE_LARGADA_LOCAL?: string | null;
    EVE_LARGADA_LINK?: string | null;
    EVE_CHEGADA_LOCAL?: string | null;
    EVE_CHEGADA_LINK?: string | null;
    EVE_INFORMACOES?: string | null;
    EVE_ROTA_LINK_MAPS?: string | null;
    EVE_ROTA_LINK_STRAVA?: string | null;
    EVE_LINK_FOTOS?: string | null;
    EVE_OBSERVACOES_EQUIPE?: string | null;
    TemFlyer: boolean;
    TemImagemRota: boolean;
    GpxNome?: string | null;
    Equipe?: EventoPublicoEquipeItem[] | null;
}
