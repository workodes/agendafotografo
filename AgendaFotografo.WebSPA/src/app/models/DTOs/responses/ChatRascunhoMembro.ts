/* eslint-disable @typescript-eslint/naming-convention */
import { EventoResumo } from './EventoResumo';

// Membro sugerido para a escala do rascunho. OutrosEventos = conflitos do dia (só avisam).
export class ChatRascunhoMembro {
    EVM_MEMBRO_ID: string;
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    EVM_POSICAO?: string | null;
    OutrosEventos: EventoResumo[];
}
