import { Params } from '@angular/router';
import { AvisoItem } from 'app/models/DTOs/responses/AvisoItem';
import { TipoAviso } from 'app/models/enums/TipoAviso';
import { mesDaData } from 'app/utils/calendario';
import { destinoDoDia } from 'app/utils/destino-dia';

// Ícone (heroicons_outline) de cada tipo de aviso.
export const AVISO_ICONE: Record<number, string> = {
    [TipoAviso.PendenciasVencidas]: 'heroicons_outline:exclamation-circle',
    [TipoAviso.PendenciasVencendo]: 'heroicons_outline:clock',
    [TipoAviso.EventoProximo]: 'heroicons_outline:calendar-days',
    [TipoAviso.ConflitoEscala]: 'heroicons_outline:user-group',
    [TipoAviso.EventosPassadosSemBaixa]: 'heroicons_outline:clipboard-document-check',
};

export function iconeAviso(aviso: AvisoItem): string {
    return AVISO_ICONE[aviso.Tipo] ?? 'heroicons_outline:bell';
}

export interface DestinoAviso {
    comandos: unknown[];
    queryParams?: Params;
}

const PREFIXO = '/assinante';

/**
 * Destino do clique de um aviso. A API não conhece URLs do SPA: a rota é montada aqui.
 * Plano 24: sem o módulo Visão da semana (`visaoLiberada` = false), o conflito de escala abre a Agenda no dia.
 */
export function destinoAviso(aviso: AvisoItem, visaoLiberada = true): DestinoAviso {
    switch (aviso.Tipo) {
        case TipoAviso.PendenciasVencidas:
            return { comandos: [PREFIXO, 'pendencias'], queryParams: { prazo: 'vencidas' } };
        case TipoAviso.PendenciasVencendo:
            return { comandos: [PREFIXO, 'pendencias'], queryParams: { prazo: 'vencendo' } };
        case TipoAviso.EventoProximo:
            return aviso.EventoId ? { comandos: [PREFIXO, 'eventos', aviso.EventoId] } : { comandos: [PREFIXO, 'agenda'] };
        case TipoAviso.ConflitoEscala:
            return destinoDoDia(aviso.Data, visaoLiberada);
        case TipoAviso.EventosPassadosSemBaixa:
            return { comandos: [PREFIXO, 'agenda'], queryParams: mesDaData(aviso.Data) ? { mes: mesDaData(aviso.Data) } : undefined };
        default:
            return { comandos: [PREFIXO, 'inicio'] };
    }
}
