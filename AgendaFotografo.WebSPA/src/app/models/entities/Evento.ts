/* eslint-disable @typescript-eslint/naming-convention */
import { EventoArquivoItem } from 'app/models/DTOs/responses/EventoArquivoItem';

// EventoModel da API. EVE_DATA trafega como "yyyy-MM-dd" e EVE_HORA como "HH:mm:ss" (sempre com segundos) ou null ("a confirmar").
// Links só http/https (o front completa o https://). TipoEventoNome, OrganizadorNome e Arquivos só vêm na saída.
export class Evento {
    Id?: string;
    EVE_NOME: string;
    EVE_TIPO_EVENTO_ID: string;
    EVE_DATA: string;
    EVE_HORA?: string | null;
    EVE_CIDADE: string;
    EVE_STATUS: number;
    EVE_ORGANIZADOR_ID?: string | null;
    EVE_LARGADA_LOCAL?: string | null;
    EVE_LARGADA_LINK?: string | null;
    EVE_CHEGADA_LOCAL?: string | null;
    EVE_CHEGADA_LINK?: string | null;
    EVE_LINK_INSCRICAO?: string | null;
    EVE_LINK_FOTOS?: string | null;
    EVE_ROTA_LINK_MAPS?: string | null;
    EVE_ROTA_LINK_STRAVA?: string | null;
    EVE_INFORMACOES?: string | null;
    EVE_OBSERVACOES_EQUIPE?: string | null;
    EVE_NOTAS_INTERNAS?: string | null;
    TipoEventoNome?: string;
    OrganizadorNome?: string | null;
    Arquivos?: EventoArquivoItem[];
}
