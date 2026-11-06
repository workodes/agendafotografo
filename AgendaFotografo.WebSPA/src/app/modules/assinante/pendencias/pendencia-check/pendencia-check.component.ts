import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { StatusPendencia } from 'app/models/enums/StatusPendencia';
import { EventoService } from 'app/services/evento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';

/**
 * Caixa de "concluir com um toque": marcar grava Concluída; desmarcar grava A fazer (o "Em andamento" anterior não é lembrado).
 * Mostra snackbar com Desfazer, que regrava o status anterior. Pendência Ignorada não tem a caixa (fica desabilitada).
 * Depois de gravar chama `NotificarAlteracao()` (sino e telas que escutam) e emite `alterado` com o item devolvido.
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-check',
    imports: [MatCheckboxModule],
    template: `
        <mat-checkbox color="primary" class="shrink-0 -m-2" [checked]="item.EVP_STATUS === concluida" [disabled]="salvando || ignorada"
            [attr.aria-label]="item.EVP_STATUS === concluida ? 'Reabrir a pendência' : 'Concluir a pendência'"
            [title]="ignorada ? 'Pendência ignorada' : (item.EVP_STATUS === concluida ? 'Reabrir' : 'Concluir')"
            (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()" (change)="alternar($event)"></mat-checkbox>
    `,
})
export class PendenciaCheckComponent {
    @Input({ required: true }) item!: EventoPendenciaItem;
    @Output() alterado = new EventEmitter<EventoPendenciaItem>();

    concluida = StatusPendencia.Concluida;
    salvando = false;

    get ignorada(): boolean {
        return this.item.EVP_STATUS === StatusPendencia.Ignorada;
    }

    constructor(private _service: EventoService, private _snackBar: MatSnackBar) { }

    alternar(event: MatCheckboxChange): void {
        if (this.salvando || this.ignorada) {
            return;
        }
        const anterior = this.item.EVP_STATUS;
        const novo = event.checked ? StatusPendencia.Concluida : StatusPendencia.AFazer;
        const id = this.item.Id;
        this.salvando = true;
        this._service.AtualizarStatusPendencia(id, { EVP_STATUS: novo }).subscribe({
            next: item => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                this.alterado.emit(item);
                this._snackBar.open(event.checked ? 'Pendência concluída.' : 'Pendência reaberta.', 'Desfazer', { duration: 6000 })
                    .onAction().subscribe(() => this.desfazer(id, anterior));
            },
            error: error => {
                this.salvando = false;
                event.source.checked = !event.checked; // volta ao estado gravado
                this._snackBar.open(mensagemErro(error, 'Não foi possível mudar o status.'), 'X', { duration: 6000 });
            },
        });
    }

    // Regrava o status anterior. Usa só o service (o componente pode já ter sido destruído pela recarga da lista).
    private desfazer(id: string, anterior: number): void {
        this._service.AtualizarStatusPendencia(id, { EVP_STATUS: anterior }).subscribe({
            next: () => this._service.NotificarAlteracao(),
            error: error => this._snackBar.open(mensagemErro(error, 'Não foi possível desfazer.'), 'X', { duration: 6000 }),
        });
    }
}
