import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { EMPTY, Observable, catchError, filter, map, switchMap, tap } from 'rxjs';
import { Assinante } from 'app/models/entities/Assinante';
import { AssinanteService } from 'app/services/assinante.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirSenhaTemporaria } from './senha-temporaria-dialog/senha-temporaria-dialog.component';

interface AssinanteRef {
    Id: string;
    ASS_NOME: string;
    ASS_EMAIL: string;
}

// Ações de linha/ficha compartilhadas pela lista e pela ficha: confirmam, chamam a API, avisam e
// notificam a lista. Cada método emite UMA vez (o assinante atualizado) só em caso de sucesso.
@Injectable({ providedIn: 'root' })
export class AssinanteAcoesService {
    private _service = inject(AssinanteService);
    private _confirmacao = inject(FuseConfirmationService);
    private _dialog = inject(MatDialog);
    private _snackBar = inject(MatSnackBar);

    bloquear(a: AssinanteRef): Observable<Assinante> {
        return this.confirmar(
            'Bloquear assinante',
            `Bloquear ${a.ASS_NOME}? Ele perde o acesso na hora e não consegue entrar até ser reativado.`,
            'Bloquear', 'warn', 'heroicons_outline:no-symbol',
        ).pipe(
            switchMap(() => this._service.Inativar(a.Id).pipe(this.tratarErro('Não foi possível bloquear o assinante.'))),
            tap(() => this.sucesso('Assinante bloqueado.')),
        );
    }

    reativar(a: AssinanteRef): Observable<Assinante> {
        return this.confirmar(
            'Reativar assinante',
            `Reativar ${a.ASS_NOME}?`,
            'Reativar', 'primary', 'heroicons_outline:check-circle',
        ).pipe(
            switchMap(() => this._service.Ativar(a.Id).pipe(this.tratarErro('Não foi possível reativar o assinante.'))),
            tap(() => this.sucesso('Assinante reativado.')),
        );
    }

    // Gera a nova senha temporária e a mostra no modal (uma única vez). Emite o assinante sem a senha.
    redefinirAcesso(a: AssinanteRef): Observable<Assinante> {
        return this.confirmar(
            'Redefinir acesso',
            `Redefinir o acesso de ${a.ASS_NOME}? Uma nova senha temporária será gerada e a atual deixa de valer.`,
            'Redefinir', 'primary', 'heroicons_outline:key',
        ).pipe(
            switchMap(() => this._service.RedefinirAcesso(a.Id).pipe(this.tratarErro('Não foi possível redefinir o acesso.'))),
            tap(resp => {
                this._service.NotificarAlteracao();
                abrirSenhaTemporaria(this._dialog, resp.Assinante.ASS_NOME, resp.Assinante.ASS_EMAIL, resp.SenhaTemporaria);
            }),
            map(resp => resp.Assinante),
        );
    }

    private sucesso(mensagem: string): void {
        this._service.NotificarAlteracao();
        this._snackBar.open(mensagem, 'X', { duration: 4000 });
    }

    private tratarErro<T>(padrao: string) {
        return catchError<T, Observable<never>>(error => {
            this._snackBar.open(mensagemErro(error, padrao), 'X', { duration: 6000 });
            return EMPTY;
        });
    }

    private confirmar(title: string, message: string, rotuloOk: string, cor: 'primary' | 'warn', icone: string): Observable<string> {
        return this._confirmacao.open({
            title,
            message,
            icon: { show: true, name: icone, color: cor },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: rotuloOk, color: cor } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed'));
    }
}
