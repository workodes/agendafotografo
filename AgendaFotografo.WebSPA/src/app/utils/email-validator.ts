import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/**
 * Valida e-mail ignorando espaços no começo e no fim (comum ao copiar/colar ou digitar),
 * para o usuário não achar que o sistema está com erro. O valor enviado deve ser aparado
 * com `normalizarEmail` (o servidor também faz Trim).
 */
export const emailTolerante: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const valor = typeof control.value === 'string' ? control.value.trim() : control.value;
    return Validators.email({ value: valor } as AbstractControl);
};

export function normalizarEmail(valor: string | null | undefined): string {
    return (valor ?? '').trim();
}
