import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Apara e completa o "https://" quando faltar. Vazio devolve ''. Outros esquemas (ftp://, javascript:) ficam como estão e falham na validação. */
export function normalizarUrl(valor: string | null | undefined): string {
    const v = (valor ?? '').trim();
    if (!v) {
        return '';
    }
    if (/^https?:\/\//i.test(v) || (/^[a-z][a-z0-9+.-]*:/i.test(v) && !/^[^\s/]+:\d+/.test(v))) {
        return v;
    }
    return `https://${v}`;
}

/** Link opcional: só http/https com domínio (até 500 caracteres, depois de completar o https://). */
export function urlHttp(control: AbstractControl): ValidationErrors | null {
    const v = normalizarUrl(control.value);
    if (!v) {
        return null;
    }
    if (v.length > 500) {
        return { maxlength: { requiredLength: 500, actualLength: v.length } };
    }
    try {
        const u = new URL(v);
        const ok = (u.protocol === 'http:' || u.protocol === 'https:') && (u.hostname.includes('.') || u.hostname === 'localhost');
        return ok && !/\s/.test(v) ? null : { url: true };
    } catch {
        return { url: true };
    }
}
