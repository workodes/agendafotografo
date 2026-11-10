/* eslint-disable @typescript-eslint/naming-convention */
// api/Chat/Status. Ligado = false quando a configuração do assistente está incompleta na API.
export class ChatStatus {
    Ligado: boolean;
    LimiteDiario: number;
    UsadasHoje: number;
}
