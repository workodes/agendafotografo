/* eslint-disable @typescript-eslint/naming-convention */
// Detalhe somente leitura do evento em que o Fotógrafo foi escalado (lista branca da API).
export class EscalaEventoModel {
    EventoId: string;
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
    TemImagemRota: boolean;
    GpxNome?: string | null;
    EVM_POSICAO?: string | null;
    CoordenadorNome: string;
}
