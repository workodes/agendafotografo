import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { formatarDataComDiaSemana } from 'app/utils/data-evento';
import { abrirRota } from 'app/utils/navegar';
import { PendenciaDialogData, PendenciaDialogResultado } from '../pendencia-dialog/pendencia-dialog.component';
import { PendenciaFormComponent } from '../pendencia-form/pendencia-form.component';

/**
 * Painel de detalhe da pendência (a partir de `lg`), no desenho do painel de detalhe do mailbox: barra de ferramentas `bg-gray-50`,
 * conteúdo rolável e rodapé Excluir / Cancelar / Salvar. Embute o `app-pendencia-form`. Cancelar e o X pedem para fechar o painel (`fechar`);
 * quem hospeda confirma o descarte quando `sujo`.
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-detalhe',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PendenciaFormComponent],
    host: { class: 'flex flex-col flex-auto min-w-0 min-h-0 h-full bg-card' },
    template: `
        <div class="flex items-center gap-3 min-h-16 px-6 py-2 border-b bg-gray-50 shrink-0">
            <div class="flex flex-col flex-auto min-w-0">
                <span role="link" tabindex="0" class="font-semibold underline cursor-pointer truncate" [attr.title]="pendencia.EVE_NOME"
                    (click)="abrirEvento($event)" (auxclick)="abrirEvento($event)" (keydown.enter)="abrirEvento()">{{ pendencia.EVE_NOME }}</span>
                <span class="text-sm text-secondary truncate">{{ formatarData(pendencia.EVE_DATA) }}</span>
            </div>
            <span *ngIf="pendencia.Vencida" class="shrink-0 leading-none rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-800">Vencida</span>
            <span *ngIf="pendencia.Vencendo" class="shrink-0 leading-none rounded-full px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800">Vencendo</span>
            <span *ngIf="pendencia.EVP_MODELO_ID" class="shrink-0 leading-none rounded-full px-2 py-1 text-xs font-semibold bg-gray-200 text-gray-700">Padrão</span>
            <button mat-icon-button type="button" aria-label="Fechar o detalhe" (click)="fechar.emit()">
                <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
            </button>
        </div>

        <div class="flex-auto min-h-0 overflow-y-auto overflow-x-hidden p-6">
            <app-pendencia-form #f [data]="dados" (concluido)="concluido.emit($event)" (cancelado)="fechar.emit()"></app-pendencia-form>
        </div>

        <div class="flex items-center gap-2 px-6 py-3 border-t shrink-0">
            <button mat-stroked-button color="warn" type="button" [disabled]="f.salvando || f.excluindo" (click)="f.excluir()">
                <mat-progress-spinner *ngIf="f.excluindo" diameter="20" mode="indeterminate"></mat-progress-spinner>
                <ng-container *ngIf="!f.excluindo">
                    <mat-icon svgIcon="heroicons_outline:trash"></mat-icon>
                    <span class="ml-2">Excluir</span>
                </ng-container>
            </button>
            <span class="flex-1"></span>
            <button mat-button type="button" [disabled]="f.salvando || f.excluindo" (click)="f.cancelar()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" [disabled]="f.salvando || f.excluindo" (click)="f.salvar()">
                <mat-progress-spinner *ngIf="f.salvando" diameter="20" mode="indeterminate"></mat-progress-spinner>
                <span *ngIf="!f.salvando">Salvar</span>
            </button>
        </div>
    `,
})
export class PendenciaDetalheComponent {
    @Output() concluido = new EventEmitter<PendenciaDialogResultado>();
    @Output() fechar = new EventEmitter<void>();
    @ViewChild('f', { static: true }) formulario!: PendenciaFormComponent;

    formatarData = formatarDataComDiaSemana;
    dados!: PendenciaDialogData;
    private _pendencia!: EventoPendenciaItem;

    @Input({ required: true }) set pendencia(p: EventoPendenciaItem) {
        this._pendencia = p;
        this.dados = { eventoId: p.EVP_EVENTO_ID, eventoNome: p.EVE_NOME, eventoData: p.EVE_DATA, pendencia: p };
    }
    get pendencia(): EventoPendenciaItem {
        return this._pendencia;
    }

    /** Há edição não salva no formulário. */
    get sujo(): boolean {
        return this.formulario?.sujo ?? false;
    }

    constructor(private _router: Router, private _route: ActivatedRoute) { }

    // Nome do evento: abre a ficha (Ctrl/Cmd+clique em nova guia).
    abrirEvento(event?: MouseEvent): void {
        abrirRota(this._router, this._route, ['/assinante/eventos', this._pendencia.EVP_EVENTO_ID], event);
    }
}
