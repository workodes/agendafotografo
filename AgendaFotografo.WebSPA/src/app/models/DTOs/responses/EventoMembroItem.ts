/* eslint-disable @typescript-eslint/naming-convention */
import { EventoResumo } from './EventoResumo';

// Linha da escala de um evento. Id = Id da linha da escala (usado em AtualizarMembro/RemoverMembro), não o do membro.
// MEM_FUNCAO é o enum FuncaoMembro. OutrosEventos = demais eventos não cancelados do mesmo dia (alerta de conflito).
export class EventoMembroItem {
    Id: string;
    EVM_EVENTO_ID: string;
    EVM_MEMBRO_ID: string;
    EVM_POSICAO?: string | null;
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    MEM_ATIVO: boolean;
    OutrosEventos: EventoResumo[];
}

// Membro ativo ainda fora da escala do evento (Id = Id do membro).
export class OpcaoEscalaItem {
    Id: string;
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_FUNCAO: number;
    OutrosEventos: EventoResumo[];
}
