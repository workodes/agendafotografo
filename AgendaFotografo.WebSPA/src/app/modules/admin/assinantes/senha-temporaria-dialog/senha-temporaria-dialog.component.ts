import { Component, OnDestroy, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

export interface SenhaTemporariaDialogData {
    nome: string;
    email: string;
    senha: string;
}

// Abre o modal da senha temporária (depois de Criar e de Redefinir acesso). A senha vive só neste objeto
// em memória: é apagada ao fechar. Nunca vai para storage, console, rota ou URL.
export function abrirSenhaTemporaria(dialog: MatDialog, nome: string, email: string, senha: string): Observable<unknown> {
    const dados: SenhaTemporariaDialogData = { nome, email, senha };
    const ref = dialog.open(SenhaTemporariaDialogComponent, {
        width: '420px',
        maxWidth: '95vw',
        disableClose: true,
        autoFocus: false,
        data: dados,
    });
    ref.afterClosed().subscribe(() => { dados.senha = ''; });
    return ref.afterClosed();
}

@Component({
    standalone: true,
    selector: 'senha-temporaria-dialog',
    imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
    template: `
        <h2 mat-dialog-title>Senha temporária</h2>
        <mat-dialog-content>
            <div class="flex items-start gap-2 rounded-md bg-amber-100 text-amber-900 p-3 mb-4 text-sm">
                <mat-icon class="icon-size-5 shrink-0" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                <span>Anote ou copie agora: ela não será exibida novamente.</span>
            </div>
            <p class="text-sm text-secondary mb-3">
                <strong>{{ dados.nome }}</strong> deverá trocar a senha no primeiro acesso.
            </p>
            <mat-form-field class="w-full" subscriptSizing="dynamic">
                <mat-label>Login (e-mail)</mat-label>
                <input matInput type="text" readonly autocomplete="off" [value]="dados.email" (focus)="$any($event.target).select()">
            </mat-form-field>
            <mat-form-field class="w-full mt-3" subscriptSizing="dynamic">
                <mat-label>Senha temporária</mat-label>
                <input matInput type="text" readonly autocomplete="off" spellcheck="false" [value]="dados.senha"
                    (focus)="$any($event.target).select()">
            </mat-form-field>
        </mat-dialog-content>
        <mat-dialog-actions class="!flex-wrap gap-2" align="end">
            <button mat-stroked-button type="button" (click)="copiarSenha()">
                <mat-icon svgIcon="heroicons_outline:clipboard-document"></mat-icon>
                <span class="ml-2">Copiar senha</span>
            </button>
            <button mat-stroked-button type="button" (click)="copiarInstrucoes()">
                <mat-icon svgIcon="heroicons_outline:clipboard-document-check"></mat-icon>
                <span class="ml-2">Copiar instruções</span>
            </button>
            <button mat-flat-button color="primary" type="button" (click)="concluir()">Concluir</button>
        </mat-dialog-actions>
    `,
})
export class SenhaTemporariaDialogComponent implements OnDestroy {
    readonly dados = inject<SenhaTemporariaDialogData>(MAT_DIALOG_DATA);
    private _ref = inject(MatDialogRef<SenhaTemporariaDialogComponent>);
    private _snackBar = inject(MatSnackBar);

    copiarSenha(): void {
        this.copiar(this.dados.senha, 'Senha copiada.');
    }

    // Texto pronto para colar no WhatsApp.
    copiarInstrucoes(): void {
        const texto =
            `Seu acesso ao quemclica:\n` +
            `Endereço: ${window.location.origin}\n` +
            `Usuário: ${this.dados.email}\n` +
            `Senha temporária: ${this.dados.senha}\n` +
            `No primeiro acesso você precisará criar uma nova senha.`;
        this.copiar(texto, 'Instruções copiadas.');
    }

    concluir(): void {
        this._ref.close();
    }

    ngOnDestroy(): void {
        this.dados.senha = '';
    }

    private copiar(texto: string, sucessoMsg: string): void {
        const sucesso = () => this._snackBar.open(sucessoMsg, 'X', { duration: 3000 });
        const falha = () => this._snackBar.open('Não foi possível copiar. Selecione e copie manualmente.', 'X', { duration: 5000 });
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(texto).then(sucesso, () => this.copiarLegado(texto) ? sucesso() : falha());
            return;
        }
        // Sem HTTPS (ex.: http://) a Clipboard API não existe: usa o método antigo.
        this.copiarLegado(texto) ? sucesso() : falha();
    }

    private copiarLegado(texto: string): boolean {
        const campo = document.createElement('textarea');
        campo.value = texto;
        campo.setAttribute('readonly', '');
        campo.style.position = 'fixed';
        campo.style.opacity = '0';
        document.body.appendChild(campo);
        campo.select();
        try {
            return document.execCommand('copy');
        } catch {
            return false;
        } finally {
            document.body.removeChild(campo);
        }
    }
}
