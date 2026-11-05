import { ElementRef } from "@angular/core";
import Inputmask from "inputmask";

export function aplicarMascara(elements: ElementRef[]) {
    Inputmask('datetime', {
        inputFormat: 'dd/mm/yyyy',
        placeholder: 'dd/mm/yyyy',
        alias: 'datetime',
        clearMaskOnLostFocus: false
    }).mask(elements.map(element => element.nativeElement));
}
