/* eslint-disable @typescript-eslint/naming-convention */
// TipoEventoModel da API. Na entrada só Id e TPE_NOME são lidos; TPE_ATIVO só vem na saída
// (o status muda por Inativar/Ativar).
export class TipoEvento {
    Id?: string;
    TPE_NOME: string;
    TPE_ATIVO?: boolean;
}
