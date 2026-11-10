/* eslint-disable @typescript-eslint/naming-convention */
import { Evento } from 'app/models/entities/Evento';
import { ChatRascunhoMembro } from './ChatRascunhoMembro';
import { EventoResumo } from './EventoResumo';

// Rascunho de evento montado pela IA (ela nunca grava). Evento.Id é sempre nulo; Avisos = ex.: "Não encontrei: Pedro".
export class ChatRascunho {
    Evento: Evento;
    Membros: ChatRascunhoMembro[];
    Avisos: string[];
    /** Eventos parecidos na mesma data (0 a 3). Não vai no histórico reenviado. */
    Semelhantes?: EventoResumo[];
}
