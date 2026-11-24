// Período do Financeiro (plano 22): vale para Lançamentos e Dashboard. Tudo em datas "yyyy-MM-dd" sem fuso (usa data-evento.ts).
// "Tudo" = sem datas (a API usa do primeiro ao último lançamento). A semana começa na segunda (igual ao calendário da Agenda).
import { nomeDoMes } from './calendario';
import { formatarData, formatarDataIso, hojeIso, parseDataIso } from './data-evento';

export type TipoPeriodo = 'tudo' | 'hoje' | 'semana' | 'mes' | 'tres-meses' | 'ano' | 'personalizado';

export interface PeriodoFinanceiro {
    tipo: TipoPeriodo;
    /** "yyyy-MM-dd"; null em "Tudo". */
    dataDe: string | null;
    dataAte: string | null;
}

export const PERIODOS_FINANCEIRO: { valor: TipoPeriodo; rotulo: string }[] = [
    { valor: 'tudo', rotulo: 'Tudo' },
    { valor: 'hoje', rotulo: 'Hoje' },
    { valor: 'semana', rotulo: 'Semana' },
    { valor: 'mes', rotulo: 'Este mês' },
    { valor: 'tres-meses', rotulo: '3 meses' },
    { valor: 'ano', rotulo: 'Este ano' },
    { valor: 'personalizado', rotulo: 'Personalizado' },
];

export const PERIODO_PADRAO: TipoPeriodo = 'mes';

/**
 * Calcula dataDe/dataAte de uma opção. `personalizado` usa as datas informadas (ambas obrigatórias, início <= fim);
 * se faltarem ou estiverem invertidas, devolve null.
 */
export function calcularPeriodo(tipo: TipoPeriodo, hoje: string = hojeIso(), personalizado?: { dataDe: string | null; dataAte: string | null }): PeriodoFinanceiro | null {
    const base = parseDataIso(hoje) ?? new Date();
    const a = base.getFullYear();
    const m = base.getMonth();

    switch (tipo) {
        case 'tudo':
            return { tipo, dataDe: null, dataAte: null };
        case 'hoje':
            return { tipo, dataDe: formatarDataIso(base), dataAte: formatarDataIso(base) };
        case 'semana': {
            const deslocamento = (base.getDay() + 6) % 7; // segunda = 0
            const segunda = new Date(a, m, base.getDate() - deslocamento);
            const domingo = new Date(a, m, base.getDate() - deslocamento + 6);
            return { tipo, dataDe: formatarDataIso(segunda), dataAte: formatarDataIso(domingo) };
        }
        case 'mes':
            return { tipo, dataDe: formatarDataIso(new Date(a, m, 1)), dataAte: formatarDataIso(new Date(a, m + 1, 0)) };
        case 'tres-meses':
            return { tipo, dataDe: formatarDataIso(new Date(a, m - 2, 1)), dataAte: formatarDataIso(new Date(a, m + 1, 0)) };
        case 'ano':
            return { tipo, dataDe: formatarDataIso(new Date(a, 0, 1)), dataAte: formatarDataIso(new Date(a, 11, 31)) };
        case 'personalizado': {
            const de = parseDataIso(personalizado?.dataDe);
            const ate = parseDataIso(personalizado?.dataAte);
            if (!de || !ate || de.getTime() > ate.getTime()) {
                return null;
            }
            return { tipo, dataDe: formatarDataIso(de), dataAte: formatarDataIso(ate) };
        }
    }
}

/** Texto curto do período para subtítulos: "01/11/2026 a 30/11/2026" ou "Todo o período". */
export function descreverPeriodo(p: { dataDe: string | null; dataAte: string | null }): string {
    if (!p.dataDe || !p.dataAte) {
        return 'Todo o período';
    }
    return p.dataDe === p.dataAte ? formatarData(p.dataDe) : `${formatarData(p.dataDe)} a ${formatarData(p.dataAte)}`;
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Rótulo de um ponto da série do Dashboard: "05/11" (por dia) ou "nov/26" (por mês). */
export function rotuloSerie(periodo: string, porDia: boolean): string {
    const d = parseDataIso(periodo);
    if (!d) {
        return '';
    }
    if (porDia) {
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
}

/** Rótulo por extenso (leitor de tela): "05/11/2026" (por dia) ou "novembro de 2026" (por mês). */
export function rotuloSerieExtenso(periodo: string, porDia: boolean): string {
    if (porDia) {
        return formatarData(periodo);
    }
    return nomeDoMes(periodo.substring(0, 7), false);
}
