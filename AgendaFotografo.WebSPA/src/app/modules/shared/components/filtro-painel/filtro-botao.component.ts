import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Botão de filtro da listagem; mostra um ponto quando há filtro diferente do padrão. */
@Component({
    standalone: true,
    selector: 'app-filtro-botao',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    template: `
        <button mat-icon-button type="button" class="relative" aria-label="Filtros" title="Filtros"
            (click)="clicado.emit()">
            <mat-icon svgIcon="heroicons_outline:adjustments-horizontal"></mat-icon>
            <span *ngIf="ativo" class="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-primary-500 ring-2 ring-white"></span>
        </button>
    `,
})
export class FiltroBotaoComponent {
    /** Há filtro aplicado diferente do padrão. */
    @Input() ativo = false;
    @Output() clicado = new EventEmitter<void>();
}
