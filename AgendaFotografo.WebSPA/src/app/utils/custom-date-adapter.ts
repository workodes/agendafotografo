import { Injectable } from "@angular/core";
import { NativeDateAdapter } from "@angular/material/core";

@Injectable({
  providedIn: 'root'
})
export class CustomDateAdapter extends NativeDateAdapter {

  override parse(value: unknown): Date | null {
    if (!value) return null;

    // Se já for Date válida
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value;
    }

    // Se for string no formato dd/MM/yyyy
    if (typeof value === 'string') {
      const trimmed = value.trim();

      const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const match = trimmed.match(regex);

      if (match) {
        const [, day, month, year] = match.map(Number);

        const date = new Date(year, month - 1, day);

        // Validação real da data (evita 31/02, por exemplo)
        if (
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day
        ) {
          return date;
        }

        return null;
      }

      // fallback: tenta parse padrão
      const parsed = Date.parse(trimmed);
      return isNaN(parsed) ? null : new Date(parsed);
    }

    // Se for timestamp
    if (typeof value === 'number') {
      return new Date(value);
    }

    return null;
  }

  override format(date: Date, displayFormat: any): string {
    if (!date || isNaN(date.getTime())) return '';

    const day = this._to2digit(date.getDate());
    const month = this._to2digit(date.getMonth() + 1);
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private _to2digit(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
  }
}