import { AbstractControl, ValidationErrors } from '@angular/forms';

// Instagram: o usuário pode digitar ou colar com "@" e espaços; a API remove TODOS os espaços e o "@" do início, e só ponto,
// sublinhado, letras e números valem. O front faz o mesmo antes de validar e de enviar.
export function limparInstagram(valor: string | null | undefined): string {
    return (valor ?? '').replace(/\s+/g, '').replace(/^@+/, '');
}

export function instagramValido(control: AbstractControl): ValidationErrors | null {
    const v = limparInstagram(control.value);
    if (v.length > 100) { return { maxlength: { requiredLength: 100, actualLength: v.length } }; }
    return !v || /^[A-Za-z0-9._]+$/.test(v) ? null : { instagram: true };
}

export const somenteDigitos = (v: string | null | undefined): string => (v ?? '').replace(/\D/g, '');
