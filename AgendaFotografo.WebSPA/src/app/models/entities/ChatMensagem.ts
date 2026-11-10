/* eslint-disable @typescript-eslint/naming-convention */
import { ChatRascunho } from 'app/models/DTOs/responses/ChatRascunho';
import { EventoResumo } from 'app/models/DTOs/responses/EventoResumo';

// Resultado da gravação do rascunho pelo card: o evento criado e quem não pôde ser escalado.
export class ChatLancamento {
    EventoId: string;
    NaoEscalados: string[];
}

// Mensagem da conversa do painel (guardada em sessionStorage). Papel = PapelChat.
// Sistema = aviso/erro mostrado só na tela (nunca enviado à API). Rascunho/Lancamento só nas respostas do assistente.
export class ChatMensagem {
    Papel: number;
    Texto: string;
    Rascunho?: ChatRascunho | null;
    Lancamento?: ChatLancamento | null;
    /** Eventos citados na resposta (lista clicável sob a bolha). Nunca reenviados à API. */
    Eventos?: EventoResumo[] | null;
    /** Mensagem do usuário que levou a imagem do flyer. Só a marca: a imagem nunca vai para o sessionStorage. */
    TemImagem?: boolean;
    Sistema?: boolean;
}
