import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subject, filter, takeUntil } from 'rxjs';
import { TipoEvento } from 'app/models/entities/TipoEvento';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';

@Component({
    standalone: true,
    selector: 'tipo-evento-details',
    templateUrl: './tipo-evento-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class TipoEventoDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é atualizado por Inativar/Ativar).
    tipo?: TipoEvento;
    salvando = false;
    acaoEmAndamento = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: TipoEventoService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
    ) { }

    get ehNovo(): boolean {
        return !this.tipo?.Id;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            TPE_NOME: ['', [Validators.required, Validators.maxLength(60)]],
        });

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const tipo = data['data']?.tipoEvento as TipoEvento | undefined;
            this.tipo = tipo;
            this.form.reset({ TPE_NOME: tipo?.TPE_NOME ?? '' });
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    salvar(): void {
        if (this.salvando) {
            return;
        }
        // Espaços não contam: o nome é aparado antes de validar (a API também faz Trim).
        const nome = (this.form.get('TPE_NOME')?.value ?? '').trim();
        this.form.get('TPE_NOME')?.setValue(nome);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }

        const body: TipoEvento = { Id: this.tipo?.Id, TPE_NOME: nome };
        this.salvando = true;

        if (body.Id) {
            this._service.Update(body).subscribe({
                next: () => this.sucessoAoSalvar(),
                error: error => this.falhaAoSalvar(error),
            });
            return;
        }

        delete body.Id;
        this._service.Add(body).subscribe({
            next: () => this.sucessoAoSalvar(),
            error: error => this.falhaAoSalvar(error),
        });
    }

    inativar(): void {
        this.confirmar(
            'Inativar tipo de evento',
            `Inativar "${this.tipo?.TPE_NOME}"? Ele deixa de aparecer nas opções de novos eventos, mas pode ser reativado depois.`,
            'Inativar', 'warn', 'heroicons_outline:no-symbol',
            () => this._service.Inativar(this.tipo!.Id!), 'Tipo de evento inativado.', 'Não foi possível inativar o tipo de evento.',
        );
    }

    ativar(): void {
        this.confirmar(
            'Ativar tipo de evento',
            `Ativar "${this.tipo?.TPE_NOME}"?`,
            'Ativar', 'primary', 'heroicons_outline:check-circle',
            () => this._service.Ativar(this.tipo!.Id!), 'Tipo de evento ativado.', 'Não foi possível ativar o tipo de evento.',
        );
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    private confirmar(
        title: string, message: string, rotuloOk: string, cor: 'primary' | 'warn', icone: string,
        acao: () => ReturnType<TipoEventoService['Inativar']>, sucesso: string, padrao: string,
    ): void {
        if (this.acaoEmAndamento || !this.tipo?.Id) {
            return;
        }
        this._confirmacao.open({
            title,
            message,
            icon: { show: true, name: icone, color: cor },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: rotuloOk, color: cor } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.acaoEmAndamento = true;
            acao().subscribe({
                next: atualizado => {
                    this.tipo = atualizado;
                    this.acaoEmAndamento = false;
                    this._snackBar.open(sucesso, 'X', { duration: 4000 });
                    this._service.NotificarAlteracao();
                },
                error: error => {
                    this.acaoEmAndamento = false;
                    this._snackBar.open(mensagemErro(error, padrao), 'X', { duration: 6000 });
                },
            });
        });
    }

    private sucessoAoSalvar(): void {
        this.salvando = false;
        this._snackBar.open('Tipo de evento salvo com sucesso.', 'X', { duration: 4000 });
        this._service.NotificarAlteracao();
        this.voltar();
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o tipo de evento.'), 'X', { duration: 6000 });
    }
}
