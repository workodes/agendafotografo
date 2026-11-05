/* eslint-disable @typescript-eslint/naming-convention */
// Corpo de api/Evento/AdicionarMembro.
export class EventoMembroModel {
    EVM_EVENTO_ID: string;
    EVM_MEMBRO_ID: string;
    EVM_POSICAO?: string | null;
}

// Corpo de api/Evento/AtualizarMembro (muda só a posição).
export class EventoMembroPosicaoModel {
    EVM_POSICAO?: string | null;
}
