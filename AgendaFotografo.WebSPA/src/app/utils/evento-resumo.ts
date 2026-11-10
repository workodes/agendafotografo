import { formatarDataComDiaSemana, formatarHora } from 'app/utils/data-evento';
import { EventoResumo } from 'app/models/DTOs/responses/EventoResumo';

/** Linha de apoio de um evento resumido: "Sáb 14/11 · 07:00 · Joinville" (sem hora, "A confirmar"). */
export function linhaEventoResumo(e: EventoResumo): string {
    return [formatarDataComDiaSemana(e.EVE_DATA), formatarHora(e.EVE_HORA), e.EVE_CIDADE].filter(p => !!p).join(' · ');
}
