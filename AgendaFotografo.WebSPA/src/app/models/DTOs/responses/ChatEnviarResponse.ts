/* eslint-disable @typescript-eslint/naming-convention */
import { ChatRascunho } from './ChatRascunho';
import { EventoResumo } from './EventoResumo';

// api/Chat/Enviar: texto da resposta e, no máximo, um rascunho.
export class ChatEnviarResponse {
    Texto: string;
    Rascunho: ChatRascunho | null;
    /** Eventos citados na resposta (0 a 10). */
    Eventos?: EventoResumo[];
}
