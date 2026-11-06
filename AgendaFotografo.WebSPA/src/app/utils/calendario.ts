// Calendário mensal da Agenda. Tudo sobre datas "yyyy-MM-dd" e meses "yyyy-MM", sem fuso (usa data-evento.ts).
// A semana começa na segunda-feira; a grade tem sempre 6 semanas (42 dias).
import { formatarDataIso, hojeIso, parseDataIso } from './data-evento';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Cabeçalho da grade, começando na segunda. */
export const CABECALHO_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const DIAS_DA_GRADE = 42;

const pad = (n: number): string => String(n).padStart(2, '0');

export interface DiaDaGrade {
    /** "yyyy-MM-dd" */
    data: string;
    /** Dia do mês (1 a 31). */
    numero: number;
    foraDoMes: boolean;
    /** Sábado ou domingo. */
    fimDeSemana: boolean;
}

/** "yyyy-MM" válido (mês 01 a 12) -> true. */
export function mesValido(mes: string | null | undefined): boolean {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes ?? '');
}

/** Mês atual como "yyyy-MM". */
export function mesAtual(): string {
    return hojeIso().substring(0, 7);
}

/** Mês de uma data "yyyy-MM-dd" ("yyyy-MM"); vazio se a data for inválida. */
export function mesDaData(iso: string | null | undefined): string {
    return parseDataIso(iso) ? iso!.substring(0, 7) : '';
}

/** Soma meses a um "yyyy-MM". */
export function somarMeses(mes: string, qtd: number): string {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m - 1 + qtd, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function mesAnterior(mes: string): string {
    return somarMeses(mes, -1);
}

export function mesSeguinte(mes: string): string {
    return somarMeses(mes, 1);
}

/** "Novembro de 2026". */
export function nomeDoMes(mes: string, maiuscula = true): string {
    const [a, m] = mes.split('-').map(Number);
    const nome = MESES[m - 1] ?? '';
    return `${maiuscula ? nome.charAt(0).toUpperCase() + nome.slice(1) : nome} de ${a}`;
}

/** Os 42 dias da grade: da segunda-feira na data (ou antes) do dia 1 até completar 6 semanas. */
export function gradeDoMes(mes: string): DiaDaGrade[] {
    const [a, m] = mes.split('-').map(Number);
    const primeiro = new Date(a, m - 1, 1);
    const deslocamento = (primeiro.getDay() + 6) % 7; // segunda = 0
    const dias: DiaDaGrade[] = [];
    for (let i = 0; i < DIAS_DA_GRADE; i++) {
        const d = new Date(a, m - 1, 1 - deslocamento + i);
        dias.push({
            data: formatarDataIso(d),
            numero: d.getDate(),
            foraDoMes: d.getMonth() !== m - 1,
            fimDeSemana: d.getDay() === 0 || d.getDay() === 6,
        });
    }
    return dias;
}

/** Primeiro e último dia da grade ("yyyy-MM-dd"): é o intervalo pedido à API. */
export function intervaloDaGrade(mes: string): { dataDe: string; dataAte: string } {
    const grade = gradeDoMes(mes);
    return { dataDe: grade[0].data, dataAte: grade[grade.length - 1].data };
}
