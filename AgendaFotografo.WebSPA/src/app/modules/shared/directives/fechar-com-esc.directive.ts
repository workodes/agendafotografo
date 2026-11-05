import { DOCUMENT } from '@angular/common';
import { Directive, EventEmitter, Inject, NgZone, OnDestroy, OnInit, Output } from '@angular/core';

/**
 * Ponto único do ESC das listagens (ficha em drawer e painel de filtros).
 *
 * Escuta `keydown` no documento em fase de CAPTURA, ou seja, antes do overlay dispatcher do CDK, que fecha o popup
 * (e já o remove do DOM) no mesmo evento. Assim dá para saber se o ESC pertence a um popup do Material e, nesse caso,
 * não fazer nada. Não depende do foco: o ESC funciona mesmo com o foco em BODY (botão desabilitado, animação, popup
 * que acabou de fechar).
 *
 * Emite `esc` somente quando: a tecla é ESC pura (sem modificadores), o evento não teve `defaultPrevented` e não há
 * popup/diálogo do Material aberto que deva consumi-la (select, datepicker, autocomplete, menu, dialog). Não usa
 * "existe overlay aberto": o snackbar também é overlay e não deve bloquear o ESC.
 * Quem usa decide o que fechar (painel de filtros ou ficha) e ignora se nada estiver aberto.
 * Os `mat-drawer` das fichas usam `[disableClose]="true"` para o Material não fechá-los por conta própria
 * (o ESC de um mat-select aberto dentro da ficha borbulhava até o drawer e fechava os dois).
 */
@Directive({
    standalone: true,
    selector: '[appFecharComEsc]',
})
export class FecharComEscDirective implements OnInit, OnDestroy {
    @Output() esc = new EventEmitter<void>();

    /** Popups/diálogos do Material que consomem o ESC (verificados antes de fecharem). */
    private static readonly POPUPS = [
        '.mat-mdc-select-panel',        // mat-select e custom-search-select
        '.mat-datepicker-content',
        '.mat-mdc-autocomplete-panel',
        '.mat-mdc-menu-panel',
        '.mat-mdc-dialog-container',    // inclui o modal obrigatório de senha e o diálogo de exclusão
    ].join(',');

    private _escutador = (event: KeyboardEvent): void => this.aoTeclar(event);

    constructor(@Inject(DOCUMENT) private _document: Document, private _zone: NgZone) { }

    ngOnInit(): void {
        this._document.addEventListener('keydown', this._escutador, true);
    }

    ngOnDestroy(): void {
        this._document.removeEventListener('keydown', this._escutador, true);
    }

    private aoTeclar(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || event.defaultPrevented
            || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }
        if (this._document.querySelector(FecharComEscDirective.POPUPS)) {
            return;
        }
        this._zone.run(() => this.esc.emit());
    }
}
