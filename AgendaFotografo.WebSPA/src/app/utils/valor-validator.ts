import { AbstractControl, ValidationErrors } from '@angular/forms';
import { lerValor } from './moeda';

export const VALOR_MAXIMO = 99999999.99;

// Valor monetário obrigatório, maior que 0 e até 99.999.999,99 (o campo usa máscara e pode guardar texto ou número).
export function valorValido(c: AbstractControl): ValidationErrors | null {
    const bruto = c.value;
    if (bruto === null || bruto === undefined || bruto === '') {
        return { required: true };
    }
    const n = lerValor(bruto);
    if (n === null || n <= 0) {
        return { valorMinimo: true };
    }
    return n > VALOR_MAXIMO ? { valorMaximo: true } : null;
}
