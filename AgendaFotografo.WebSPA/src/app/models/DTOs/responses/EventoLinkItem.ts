/* eslint-disable @typescript-eslint/naming-convention */
// Saída de api/Evento/Link, AtualizarLink, RegerarCodigoLink e RegerarLink. Sem link criado: Configurado = false.
// Codigo (4 dígitos) só existe em memória no SPA: nunca guardar em storage, console, rota ou URL.
export class EventoLinkItem {
    Configurado: boolean;
    EVL_ATIVO: boolean;
    EVL_MOSTRAR_EQUIPE: boolean;
    EVL_TOKEN?: string | null;
    Codigo?: string | null;
}
