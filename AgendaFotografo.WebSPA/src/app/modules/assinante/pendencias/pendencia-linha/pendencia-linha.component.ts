import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { PRIORIDADE_PENDENCIA_COR, PRIORIDADE_PENDENCIA_ROTULO } from 'app/models/enums/PrioridadePendencia';
import { StatusPendencia } from 'app/models/enums/StatusPendencia';
import { formatarDataComDiaSemana } from 'app/utils/data-evento';
import { formatarPrazo } from 'app/utils/pendencia';
import { PendenciaCheckComponent } from '../pendencia-check/pendencia-check.component';
import { PendenciaStatusChipComponent } from '../pendencia-status-chip/pendencia-status-chip.component';

/**
 * Linha compacta da lista (a partir de `lg`), no desenho da lista do mailbox: borda esquerda de 4 px (vermelha = Vencida, âmbar = Vencendo),
 * linha selecionada em `bg-primary-50`. Clique/Enter na linha emite `abrir`; o nome do evento emite `evento` (abre a ficha).
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-linha',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, PendenciaCheckComponent, PendenciaStatusChipComponent],
    template: `
        <div role="button" tabindex="0" [attr.aria-pressed]="selecionada"
            class="flex items-start gap-3 w-full pl-3 pr-3 py-3 border-b border-l-4 cursor-pointer hover:bg-hover focus-visible:outline focus-visible:outline-2"
            [ngClass]="[bordaCor, selecionada ? 'bg-primary-50' : 'bg-card']"
            (click)="abrir.emit(item)" (keydown.enter)="abrir.emit(item)">
            <div class="pt-1.5 pl-1"><app-pendencia-check [item]="item" (alterado)="alterado.emit($event)"></app-pendencia-check></div>
            <div class="flex flex-col flex-auto min-w-0 gap-1">
                <div class="flex items-start justify-between gap-2">
                    <div class="font-semibold break-words min-w-0 leading-snug" [class.line-through]="item.EVP_STATUS === concluida" [class.opacity-60]="esmaecida">{{ item.EVP_TITULO }}</div>
                    <span *ngIf="item.EVP_MODELO_ID" class="shrink-0 leading-none rounded-full px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-600">Padrão</span>
                </div>
                <div class="text-sm text-secondary break-words">
                    <span role="link" tabindex="0" class="underline cursor-pointer"
                        (click)="evento.emit({ item: item, event: $event })" (auxclick)="evento.emit({ item: item, event: $event })"
                        (keydown.enter)="evento.emit({ item: item }); $event.stopPropagation()">{{ item.EVE_NOME }}</span>
                    · {{ formatarData(item.EVE_DATA) }}
                </div>
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm" [class.opacity-60]="esmaecida">
                    <span class="whitespace-nowrap" [class.text-secondary]="!item.EVP_PRAZO">{{ formatarPrazo(item.EVP_PRAZO) }}</span>
                    <span *ngIf="item.Vencida" class="leading-none rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-800">Vencida</span>
                    <span *ngIf="item.Vencendo" class="leading-none rounded-full px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800">Vencendo</span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="leading-none rounded-full px-2.5 py-1 text-xs font-semibold" [ngClass]="prioridadeCor[item.EVP_PRIORIDADE]">{{ prioridadeRotulo[item.EVP_PRIORIDADE] }}</span>
                    <app-pendencia-status-chip [item]="item" (alterado)="alterado.emit($event)"></app-pendencia-status-chip>
                    <span *ngIf="item.EVP_MEMBRO_ID" class="text-xs text-secondary break-words min-w-0">{{ item.MEM_NOME }}<span *ngIf="item.MEM_ATIVO === false"> (inativo)</span></span>
                </div>
            </div>
        </div>
    `,
})
export class PendenciaLinhaComponent {
    @Input({ required: true }) item!: EventoPendenciaItem;
    @Input() selecionada = false;
    @Output() abrir = new EventEmitter<EventoPendenciaItem>();
    @Output() evento = new EventEmitter<{ item: EventoPendenciaItem; event?: MouseEvent }>();
    @Output() alterado = new EventEmitter<EventoPendenciaItem>();

    prioridadeRotulo = PRIORIDADE_PENDENCIA_ROTULO;
    prioridadeCor = PRIORIDADE_PENDENCIA_COR;
    concluida = StatusPendencia.Concluida;
    formatarPrazo = formatarPrazo;
    formatarData = formatarDataComDiaSemana;

    get esmaecida(): boolean {
        return this.item.EVP_STATUS === StatusPendencia.Concluida || this.item.EVP_STATUS === StatusPendencia.Ignorada;
    }

    // Vencida e Vencendo vêm da API (o front não recalcula); os demais ficam sem cor.
    get bordaCor(): string {
        return this.item.Vencida ? 'border-l-red-500' : this.item.Vencendo ? 'border-l-amber-400' : 'border-l-transparent';
    }
}
