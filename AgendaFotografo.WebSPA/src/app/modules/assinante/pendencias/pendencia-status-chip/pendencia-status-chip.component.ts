import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { STATUS_PENDENCIA_COR, STATUS_PENDENCIA_ROTULO, StatusPendencia } from 'app/models/enums/StatusPendencia';
import { EventoService } from 'app/services/evento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';

// Chip de status da pendência com menu de 4 opções (A fazer, Em andamento, Concluída e Ignorar/Restaurar): a troca grava na hora (AtualizarStatusPendencia) e devolve o item atualizado.
@Component({
    standalone: true,
    selector: 'app-pendencia-status-chip',
    imports: [CommonModule, MatIconModule, MatMenuModule],
    template: `
        <button type="button" class="leading-none rounded-full pl-3 pr-2 py-1.5 text-xs font-semibold inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
            [ngClass]="cor[item.EVP_STATUS]" [disabled]="salvando" [matMenuTriggerFor]="menu"
            aria-label="Mudar o status da pendência" title="Mudar o status"
            (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()">
            {{ rotulo[item.EVP_STATUS] }}
            <mat-icon class="icon-size-4" svgIcon="heroicons_mini:chevron-down"></mat-icon>
        </button>
        <mat-menu #menu="matMenu">
            <!-- Ignorada já volta para A fazer pelo "Restaurar": não repete a opção -->
            <ng-container *ngFor="let s of lista">
                <button mat-menu-item type="button" *ngIf="!(ignorada && s.valor === aFazer)" [disabled]="s.valor === item.EVP_STATUS" (click)="trocar(s.valor, $event)">
                    {{ s.rotulo }}
                </button>
            </ng-container>
            <button mat-menu-item type="button" (click)="trocar(ignorada ? aFazer : statusIgnorada, $event)">
                {{ ignorada ? 'Restaurar' : 'Ignorar' }}
            </button>
        </mat-menu>
    `,
})
export class PendenciaStatusChipComponent {
    @Input({ required: true }) item!: EventoPendenciaItem;
    @Output() alterado = new EventEmitter<EventoPendenciaItem>();

    cor = STATUS_PENDENCIA_COR;
    rotulo = STATUS_PENDENCIA_ROTULO;
    // Os 3 status "de trabalho"; Ignorar/Restaurar é a quarta opção do menu.
    lista = [
        { valor: StatusPendencia.AFazer, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.AFazer] },
        { valor: StatusPendencia.EmAndamento, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.EmAndamento] },
        { valor: StatusPendencia.Concluida, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.Concluida] },
    ];
    aFazer = StatusPendencia.AFazer;
    statusIgnorada = StatusPendencia.Ignorada;
    salvando = false;

    get ignorada(): boolean {
        return this.item.EVP_STATUS === StatusPendencia.Ignorada;
    }

    constructor(private _service: EventoService, private _snackBar: MatSnackBar) { }

    trocar(status: number, event: Event): void {
        event.stopPropagation();
        if (this.salvando || status === this.item.EVP_STATUS) {
            return;
        }
        this.salvando = true;
        this._service.AtualizarStatusPendencia(this.item.Id, { EVP_STATUS: status }).subscribe({
            next: item => {
                this.salvando = false;
                // Atualiza o sino de avisos (e as telas que escutam alterado$); quem usa o chip só recarrega a própria lista.
                this._service.NotificarAlteracao();
                this.alterado.emit(item);
            },
            error: error => {
                this.salvando = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível mudar o status.'), 'X', { duration: 6000 });
            },
        });
    }
}
