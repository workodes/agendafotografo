import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { EMPTY, Observable, catchError, filter, switchMap, tap } from 'rxjs';
import { ApiResponse } from 'app/models/ApiResponse';
import { Plano } from 'app/models/entities/Plano';
import { PlanoService } from 'app/services/plano.service';
import { mensagemErro } from 'app/utils/mensagem-erro';

interface PlanoRef {
    Id?: string | null;
    PLA_NOME: string;
}

// Ações de linha/ficha dos planos, compartilhadas pela lista e pela ficha: confirmam, chamam a API, avisam e notificam a
// lista. Cada método emite UMA vez só em caso de sucesso; erro (400 em texto) vai ao snackbar.
@Injectable({ providedIn: 'root' })
export class PlanoAcoesService {
    private _service = inject(PlanoService);
    private _confirmacao = inject(FuseConfirmationService);
    private _snackBar = inject(MatSnackBar);

    inativar(p: PlanoRef): Observable<Plano> {
        return this.confirmar(
            'Inativar plano',
            `Inativar o plano "${p.PLA_NOME}"? Ele deixa de aparecer na escolha de plano dos assinantes. Quem já está nele continua com os mesmos módulos.`,
            'Inativar', 'warn', 'heroicons_outline:no-symbol',
        ).pipe(
            switchMap(() => this._service.Inativar(p.Id!).pipe(this.tratarErro('Não foi possível inativar o plano.'))),
            tap(() => this.sucesso('Plano inativado.')),
        );
    }

    ativar(p: PlanoRef): Observable<Plano> {
        return this.confirmar(
            'Ativar plano',
            `Ativar o plano "${p.PLA_NOME}"? Ele volta a aparecer na escolha de plano dos assinantes.`,
            'Ativar', 'primary', 'heroicons_outline:check-circle',
        ).pipe(
            switchMap(() => this._service.Ativar(p.Id!).pipe(this.tratarErro('Não foi possível ativar o plano.'))),
            tap(() => this.sucesso('Plano ativado.')),
        );
    }

    excluir(p: PlanoRef): Observable<ApiResponse> {
        return this.confirmar(
            'Excluir plano',
            `Excluir o plano "${p.PLA_NOME}"? Esta ação não pode ser desfeita.`,
            'Excluir', 'warn', 'heroicons_outline:trash',
        ).pipe(
            switchMap(() => this._service.Delete(p.Id!).pipe(this.tratarErro('Não foi possível excluir o plano.'))),
            tap(resp => this.sucesso(resp?.Message || 'Plano excluído.')),
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
