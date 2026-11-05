import { Directive, HostListener } from '@angular/core';

@Directive({
    selector: '[appNoSpecialChars]',
    standalone: true
})
export class NoSpecialCharsDirective {
    @HostListener('beforeinput', ['$event'])
    onBeforeInput(event: InputEvent): void {
        if (!event.data)
            return;

        /*
        // Permite somente:

        \p{L} → qualquer letra Unicode (a, á, ç, ã, etc.)
        \p{N} → qualquer número Unicode
        \s → espaços
        . , - / ( ) ' ° → pontuação comum em endereço (ex.: "Av. Brasil", "BR-153", "S/N",
                           "Qd. 5 (Lote 2)") — sem isso, endereços reais eram bloqueados.

        */

        const isValid = /^[\p{L}\p{N}\s.,\-/()'°]+$/u.test(event.data);
        if (!isValid)
            event.preventDefault();
    }
}
