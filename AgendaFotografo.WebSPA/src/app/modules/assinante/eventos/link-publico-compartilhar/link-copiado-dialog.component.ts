import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventoLinkItem } from 'app/models/DTOs/responses/EventoLinkItem';
import { EventoService } from 'app/services/evento.service';
import { copiarTexto } from 'app/utils/copiar-texto';
import { textoWhatsApp, urlWhatsApp } from 'app/utils/link-publico';
import { mensagemErro } from 'app/utils/mensagem-erro';

export interface LinkCopiadoDialogData {
    evento: { id: string; nome: string; data: string };
    link: EventoLinkItem;
}

// Modal com o código do evento em destaque e o texto pronto. Copiar e WhatsApp agem direto no clique (Safari do iPhone).
// O código existe só em memória: nunca em storage, console, rota ou URL.
@Component({
    standalone: true,
    selector: 'link-copiado-dialog',
    imports: [CommonModule, MatButtonModule, MatDialogModule, MatIconModule],
    template: `
        <h2 mat-dialog-title>Link público</h2>
        <mat-dialog-content>
            <p class="text-sm text-secondary mb-3 break-words"><strong>{{ dados.evento.nome }}</strong></p>

            <ng-container *ngIf="dados.link.EVL_ATIVO; else desativado">
                <div class="text-center mb-3">
                    <div class="text-xs font-semibold uppercase tracking-wide text-secondary">Código do evento</div>
                    <div class="text-5xl font-extrabold tracking-[0.3em] pl-[0.3em]">{{ dados.link.Codigo }}</div>
                </div>
                <pre class="whitespace-pre-wrap break-words rounded-md bg-gray-100 p-3 text-sm m-0 font-sans">{{ texto }}</pre>
            </ng-container>

            <ng-template #desativado>
                <div class="flex items-start gap-2 rounded-md bg-amber-100 text-amber-900 p-3 text-sm">
                    <mat-icon class="icon-size-5 shrink-0" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                    <span>O link está desativado: quem abrir verá "Link indisponível". Ative para voltar a compartilhar.</span>
                </div>
            </ng-template>
        </mat-dialog-content>
        <mat-dialog-actions class="!flex-wrap gap-2" align="end">
            <ng-container *ngIf="dados.link.EVL_ATIVO; else botaoAtivar">
                <button mat-stroked-button type="button" (click)="copiar()">
                    <mat-icon svgIcon="heroicons_outline:clipboard-document"></mat-icon>
                    <span class="ml-2">Copiar texto</span>
                </button>
                <button mat-stroked-button type="button" (click)="whatsapp()">
                    <mat-icon svgIcon="heroicons_outline:chat-bubble-left-right"></mat-icon>
                    <span class="ml-2">Enviar pelo WhatsApp</span>
                </button>
            </ng-container>
            <ng-template #botaoAtivar>
                <button mat-flat-button color="primary" type="button" [disabled]="ocupado" (click)="ativar()">Ativar link</button>
            </ng-template>
            <button mat-button type="button" mat-dialog-close>Fechar</button>
        </mat-dialog-actions>
    `,
})
export class LinkCopiadoDialogComponent implements OnDestroy {
    readonly dados = inject<LinkCopiadoDialogData>(MAT_DIALOG_DATA);
    private _service = inject(EventoService);
    private _snackBar = inject(MatSnackBar);
    ocupado = false;

    get texto(): string {
        const l = this.dados.link;
        return l.EVL_TOKEN && l.Codigo ? textoWhatsApp(this.dados.evento.nome, this.dados.evento.data, l.EVL_TOKEN, l.Codigo) : '';
    }

    copiar(): void {
        copiarTexto(this.texto).then(ok => this._snackBar.open(
            ok ? 'Texto copiado.' : 'Não foi possível copiar. Selecione e copie manualmente.', 'X', { duration: ok ? 3000 : 5000 }));
    }

    whatsapp(): void {
        window.open(urlWhatsApp(this.texto), '_blank', 'noopener');
    }

    ativar(): void {
        this.ocupado = true;
        this._service.AtualizarLink(this.dados.evento.id, { EVL_ATIVO: true, EVL_MOSTRAR_EQUIPE: this.dados.link.EVL_MOSTRAR_EQUIPE }).subscribe({
            next: link => { this.ocupado = false; this.dados.link = link; },
            error: error => {
                this.ocupado = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível ativar o link.'), 'X', { duration: 6000 });
            },
        });
    }

    ngOnDestroy(): void {
        this.dados.link = { ...this.dados.link, Codigo: null };
    }
}
