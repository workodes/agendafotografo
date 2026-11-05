// Datas e horas dos eventos. A API trafega a data como "yyyy-MM-dd" (sem fuso) e a hora como "HH:mm:ss" (ou null = "a confirmar").
// Nunca usar new Date('yyyy-MM-dd'): isso interpreta em UTC e desloca o dia em fusos negativos (Brasil).

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const HORA_A_CONFIRMAR = 'A confirmar';

const pad = (n: number): string => String(n).padStart(2, '0');

/** "yyyy-MM-dd" -> Date local à meia-noite (sem fuso). Devolve null se inválida. */
export function parseDataIso(iso: string | null | undefined): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
    if (!m)
        return null;

    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // Rejeita datas que o JS "corrigiu" (ex.: 2026-02-31).
    return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

/** Date -> "yyyy-MM-dd" usando o dia local. */
export function formatarDataIso(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Hoje (dia local) como "yyyy-MM-dd". */
export function hojeIso(): string {
    return formatarDataIso(new Date());
}

/** Soma dias a uma data "yyyy-MM-dd" (útil para os botões ◀ ▶ da Visão do dia). */
export function somarDiasIso(iso: string, dias: number): string {
    const d = parseDataIso(iso) ?? new Date();
    d.setDate(d.getDate() + dias);
    return formatarDataIso(d);
}

/** "dd/MM/yyyy". */
export function formatarData(iso: string | null | undefined): string {
    const d = parseDataIso(iso);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '';
}

/** "dd/MM". */
export function formatarDiaMes(iso: string | null | undefined): string {
    const d = parseDataIso(iso);
    return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '';
}

/** Dia da semana por extenso ("sábado"). */
export function diaSemana(iso: string | null | undefined): string {
    const d = parseDataIso(iso);
    return d ? DIAS_SEMANA[d.getDay()] : '';
}

/** Dia da semana abreviado ("Sáb"). */
export function diaSemanaCurto(iso: string | null | undefined): string {
    const d = parseDataIso(iso);
    return d ? DIAS_SEMANA_CURTO[d.getDay()] : '';
}

/** "Sáb 15/11". */
export function formatarDataComDiaSemana(iso: string | null | undefined): string {
    const d = parseDataIso(iso);
    return d ? `${DIAS_SEMANA_CURTO[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}` : '';
}

/** "HH:mm:ss" -> "HH:mm"; sem hora devolve "A confirmar". */
export function formatarHora(hora: string | null | undefined, vazio: string = HORA_A_CONFIRMAR): string {
    const m = /^(\d{2}):(\d{2})/.exec(hora ?? '');
    return m ? `${m[1]}:${m[2]}` : vazio;
}

/** "HH:mm" (do campo de hora) -> "HH:mm:ss" para a API (sempre com segundos); vazio vira null. */
export function horaParaApi(hora: string | null | undefined): string | null {
    const m = /^(\d{1,2}):(\d{2})/.exec((hora ?? '').trim());
    return m ? `${pad(Number(m[1]))}:${m[2]}:00` : null;
}

/** "HH:mm:ss" da API -> "HH:mm" para o campo de hora; null/vazio devolve ''. */
export function horaDaApi(hora: string | null | undefined): string {
    const m = /^(\d{2}):(\d{2})/.exec(hora ?? '');
    return m ? `${m[1]}:${m[2]}` : '';
}
