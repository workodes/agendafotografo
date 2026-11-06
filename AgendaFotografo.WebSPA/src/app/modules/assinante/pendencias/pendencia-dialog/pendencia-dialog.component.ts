import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { diaSemana, formatarData } from 'app/utils/data-evento';
import { PendenciaFormComponent } from '../pendencia-form/pendencia-form.component';

export interface PendenciaDialogData {
    // Evento da pendência (nova: o da ficha; edição: o do item).
    eventoId: string;
    eventoNome: string;
    // Data do evento "yyyy-MM-dd" (subtítulo com o dia da semana).
    eventoData: string;
    // Preenchido na edição.
    pendencia?: EventoPendenciaItem | null;
}

export interface PendenciaDialogResultado {
    acao: 'salva' | 'excluida';
    item?: EventoPendenciaItem;
}

// Modal da pendência (criar, editar e excluir), usado na ficha do evento e na tela Pendências abaixo de `lg`.
// Invólucro fino do `app-pendencia-form`: só desenha o título e os botões. Fecha devolvendo o que aconteceu (PendenciaDialogResultado) ou undefined se foi só cancelado.
@Component({
    standalone: true,
    selector: 'app-pendencia-dialog',
    templateUrl: './pendencia-dialog.component.html',
    imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule, MatProgressSpinnerModule, PendenciaFormComponent],
})
export class PendenciaDialogComponent {
    private _dialogRef = inject(MatDialogRef<PendenciaDialogComponent, PendenciaDialogResultado>);
    readonly data = inject<PendenciaDialogData>(MAT_DIALOG_DATA);

    get edicao(): boolean {
        return !!this.data.pendencia?.Id;
    }

    get subtitulo(): string {
        const dia = diaSemana(this.data.eventoData);
        const diaCap = dia ? dia.charAt(0).toUpperCase() + dia.slice(1) : '';
        const quando = diaCap ? `${diaCap}, ${formatarData(this.data.eventoData)}` : '';
        return quando ? `${this.data.eventoNome} · ${quando}` : this.data.eventoNome;
    }

    fechar(resultado: PendenciaDialogResultado): void {
        this._dialogRef.close(resultado);
    }

    cancelar(): void {
        this._dialogRef.close();
    }
}

// Abre o modal da pendência (560 px, 95vw no celular). Usado pela ficha do evento e pela tela Pendências.
export const PENDENCIA_DIALOG_CONFIG = { width: '560px', maxWidth: '95vw', autoFocus: 'first-tabbable' } as const;
