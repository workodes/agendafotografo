/* eslint-disable @typescript-eslint/naming-convention */
import { ChatRascunho } from 'app/models/DTOs/responses/ChatRascunho';

// Imagem do flyer (já reduzida): Base64 puro, sem o prefixo "data:". Só na última mensagem e só no papel Usuário.
export class ChatImagemModel {
    MediaType: string;
    Base64: string;
}

// Mensagem do histórico reenviada a cada chamada. Rascunho só no papel Assistente, no estado ATUAL do card (editado pelo usuário).
export class ChatMensagemItem {
    Papel: number;
    Texto: string;
    Rascunho?: ChatRascunho | null;
    Imagem?: ChatImagemModel | null;
}

// Corpo de api/Chat/Enviar.
export class ChatEnviarModel {
    Mensagens: ChatMensagemItem[];
}
