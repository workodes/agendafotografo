import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Cria a data local validando (rejeita 31/02 etc.). Nunca usa new Date(iso) (sem fuso, como o resto do projeto).
function criarData(ano: number, mes: number, dia: number): Date | null {
    const data = new Date(ano, mes - 1, dia);
    // Anos < 100 viram 19xx no construtor: força o ano informado.
    data.setFullYear(ano);
    if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) {
        return data;
    }
    return null;
}

/** Formatos do datepicker em pt-BR (usados em MAT_DATE_FORMATS e interpretados por `CustomDateAdapter.format`). */
export const FORMATOS_DATA_PTBR = {
    parse: { dateInput: 'dd/MM/yyyy' },
    display: {
        dateInput: 'dd/MM/yyyy',
        monthYearLabel: 'MMMM yyyy',
        dateA11yLabel: 'dd MMMM yyyy',
        monthYearA11yLabel: 'MMMM yyyy',
    },
};

/**
 * Adaptador de datas do Angular Material em pt-BR: aceita digitação "dd/MM/yyyy" (e "yyyy-MM-dd"), exibe "dd/MM/yyyy"
 * e o cabeçalho do calendário como "novembro de 2026". Os valores continuam sendo `Date` local, então o que a ficha
 * envia à API (via `formatarDataIso`) não muda.
 */
@Injectable({ providedIn: 'root' })
export class CustomDateAdapter extends NativeDateAdapter {

    override parse(value: unknown): Date | null {
        if (value instanceof Date) {
            return isNaN(value.getTime()) ? null : value;
        }
        if (typeof value !== 'string') {
            return null;
        }
        const texto = value.trim();

        let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
        if (m) {
            return criarData(Number(m[3]), Number(m[2]), Number(m[1]));
        }
        m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
        if (m) {
            return criarData(Number(m[1]), Number(m[2]), Number(m[3]));
        }
        return null;
    }

    override format(date: Date, displayFormat: any): string {
        if (!date || isNaN(date.getTime())) return '';

        if (displayFormat === 'MMMM yyyy') {
            return `${MESES[date.getMonth()]} de ${date.getFullYear()}`;
        }
        if (displayFormat === 'dd MMMM yyyy') {
            return `${date.getDate()} de ${MESES[date.getMonth()]} de ${date.getFullYear()}`;
        }
        return `${this.doisDigitos(date.getDate())}/${this.doisDigitos(date.getMonth() + 1)}/${date.getFullYear()}`;
    }

    private doisDigitos(n: number): string {
        return n < 10 ? `0${n}` : `${n}`;
    }
}
