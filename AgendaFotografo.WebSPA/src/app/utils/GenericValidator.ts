import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from "@angular/forms";

export class GenericValidator {
    constructor() { }

    /**
     * Valida se o CPF é válido. Deve-se informar o CPF sem máscara.
     */
    static isValidCpf() {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            const cpf = control.value;
            if (!cpf) {
                return null;
            }

            if (!this.isValidCpfFormat(cpf) || this.hasEqualDigits(cpf) || !this.isValidCpfChecksum(cpf)) {
                return { cpfNotValid: true };
            }

            return null;
        };
    }

    /**
     * Valida se o campo booleano é true
     */
    static isTrue() {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            if (control.value !== true) {
                return { notTrue: true }; // Retorna um erro se o valor não for `true`
            }
            return null; // Retorna `null` se o valor for `true`, indicando que está válido
        };
    }
    /**
     * Valida se o CNPJ é válido. Deve-se informar o CNPJ sem máscara.
     */
    static isValidCnpj() {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            const cnpj = control.value;
            if (!cnpj) {
                return null;
            }

            if (!this.isValidCnpjFormat(cnpj) || !this.isValidCnpjChecksum(cnpj)) {
                return { cnpjNotValid: true };
            }

            return null;
        };
    }

    static isValidCpfOrCnpj() {
        return (control: AbstractControl): { [key: string]: boolean } | null => {
            const value = control.value;

            if (!value)
                return null;

            const document = value.replace(/\D/g, '');

            if (document.length <= 11) {
                if (!this.isValidCpfFormat(document) || this.hasEqualDigits(document) || !this.isValidCpfChecksum(document))
                    return { cpfOrCnpjNotValid: true };
            } else if (document.length <= 14) {
                if (!this.isValidCnpjFormat(document) || this.hasEqualDigits(document) || !this.isValidCnpjChecksum(document))
                    return { cpfOrCnpjNotValid: true };
            } else {
                return { cpfOrCnpjNotValid: true };
            }

            return null;
        };
    }



    // Funções de validação para CPF e CNPJ...

    private static isValidCpfFormat(cpf: string): boolean {
        return /^\d{11}$/.test(cpf);
    }


    private static hasEqualDigits(cpf: string): boolean {
        return cpf.split('').every((digit, index, array) => digit === array[0]);
    }


    private static isValidCpfChecksum(cpf: string): boolean {
        const cpfArray = cpf.replace(/[^\d]/g, '').split('').map(Number);

        if (cpfArray.length !== 11) {
            return false;
        }

        const validateDigit = (digits: number[], factor: number) => {
            let total = 0;
            for (let i = 0; i < digits.length; i++) {
                total += digits[i] * factor;
                factor--;
            }
            const remainder = total % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        };

        const firstDigit = validateDigit(cpfArray.slice(0, 9), 10);
        const secondDigit = validateDigit(cpfArray.slice(0, 10), 11);

        return cpfArray[9] === firstDigit && cpfArray[10] === secondDigit;
    }

    private static isValidCnpjFormat(cnpj: string): boolean {
        return /^\d{14}$/.test(cnpj);
    }

    private static isValidCnpjChecksum(cnpj: string): boolean {
        const cnpjArray = cnpj.replace(/[^\d]/g, '').split('').map(Number);

        if (cnpjArray.length !== 14) {
            return false;
        }

        const validateDigit = (digits: number[], factor: number) => {
            let total = 0;
            for (let i = 0; i < digits.length; i++) {
                total += digits[i] * factor;
                factor--;
                if (factor === 1) {
                    factor = 9;
                }
            }
            const remainder = total % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        };

        const firstDigit = validateDigit(cnpjArray.slice(0, 12), 5);
        const secondDigit = validateDigit(cnpjArray.slice(0, 13), 6);

        return cnpjArray[12] === firstDigit && cnpjArray[13] === secondDigit;
    }



    static dataInicioMaiorQueFim(controlPath: string, matchingControlPath: string): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            // Get the control and matching control
            const control = formGroup.get(controlPath);
            const matchingControl = formGroup.get(matchingControlPath);

            // Return if control or matching control doesn't exist
            if (!control || !matchingControl) {
                return null;
            }

            // Delete the mustMatch error to reset the error on the matching control
            if (matchingControl.hasError('dataInvalida')) {
                delete matchingControl.errors.mustMatch;
                matchingControl.updateValueAndValidity();
            }

            // Don't validate empty values on the matching control
            // Don't validate if values are matching
            if (matchingControl.value == null || matchingControl.value.length === 0 || control.value === matchingControl.value) {
                return null;
            }
            // Prepare the validation errors
            if (control.value && matchingControl.value && new Date(control.value).setHours(0, 0, 0, 0) > new Date(matchingControl.value).setHours(0, 0, 0, 0)) {
                const errors = { dataInvalida: true };

                // Set the validation error on the matching control
                matchingControl.setErrors(errors);

                // Return the errors
                return errors;

            }

        };
    }

    static datasObrigatoriasEmPar(controlPath: string, matchingControlPath: string): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            const control = formGroup.get(controlPath);
            const matchingControl = formGroup.get(matchingControlPath);

            if (!control || !matchingControl) {
                return null;
            }

            // remove erro antigo
            if (matchingControl.hasError('datasIncompletas')) {
                const errors = { ...matchingControl.errors };
                delete errors['datasIncompletas'];

                matchingControl.setErrors(
                    Object.keys(errors).length ? errors : null
                );
            }

            const dataInicio = control.value;
            const dataFim = matchingControl.value;

            // ambos vazios => válido
            if (!dataInicio && !dataFim) {
                return null;
            }

            // ambos preenchidos => válido
            if (dataInicio && dataFim) {
                return null;
            }

            // apenas um preenchido => inválido
            matchingControl.setErrors({
                ...matchingControl.errors,
                datasIncompletas: true,
            });

            return { datasIncompletas: true };
        };
    }

}
