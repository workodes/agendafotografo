import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PendenciasContagem } from 'app/models/DTOs/responses/PendenciasContagem';
import { ChaveFiltroRapido, FILTROS_RAPIDOS } from 'app/utils/pendencia';

/**
 * Painel lateral de filtros rápidos da tela Pendências (desenho do sidebar do mailbox do Fuse): ícone, rótulo e selo com o contador.
 * Zero fica em cinza; Vencidas ganha selo vermelho quando maior que zero. Sem contagem (falha), os selos ficam sem número.
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-sidebar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatIconModule],
    template: `
        <div class="flex flex-col h-full py-6 px-4 overflow-y-auto">
            <div class="px-2 text-3xl font-extrabold tracking-tight leading-none">Pendências</div>
            <nav class="flex flex-col gap-1 mt-6" aria-label="Filtros rápidos">
                <button *ngFor="let f of filtros" type="button"
                    class="flex items-center gap-3 w-full min-h-10 px-3 py-2 rounded-lg text-left transition-colors hover:bg-hover"
                    [ngClass]="f.chave === atual ? 'bg-primary-50 text-primary font-semibold' : 'text-default'"
                    [attr.aria-current]="f.chave === atual ? 'true' : null" (click)="selecionar.emit(f.chave)">
                    <mat-icon class="icon-size-5 shrink-0" [class.text-secondary]="f.chave !== atual" [svgIcon]="f.icone"></mat-icon>
                    <span class="flex-auto truncate">{{ f.rotulo }}</span>
                    <span *ngIf="contagem" class="min-w-6 px-2 py-1 rounded-full text-center text-xs font-semibold leading-none"
                        [ngClass]="selo(f.chave, contagem[f.campo])">{{ contagem[f.campo] }}</span>
                </button>
            </nav>
            <div class="mt-6 px-2 text-xs text-secondary">Pendências de eventos cancelados ficam de fora.</div>
        </div>
    `,
})
export class PendenciaSidebarComponent {
    @Input() contagem: PendenciasContagem | null = null;
    // Chave do filtro rápido destacado (null = nenhum).
    @Input() atual: ChaveFiltroRapido | null = null;
    @Output() selecionar = new EventEmitter<ChaveFiltroRapido>();

    filtros = FILTROS_RAPIDOS;

    selo(chave: ChaveFiltroRapido, valor: number): string {
        if (!valor) {
            return 'bg-gray-100 text-gray-400';
        }
        return chave === 'vencidas' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700';
    }
}
