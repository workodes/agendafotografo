import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Observable, Subject, filter, takeUntil } from 'rxjs';
import { Membro } from 'app/models/entities/Membro';
import { FUNCAO_MEMBRO } from 'app/models/enums/FuncaoMembro';
import { MembroService } from 'app/services/membro.service';
import { emailTolerante, normalizarEmail } from 'app/utils/email-validator';
import { instagramValido, limparInstagram, somenteDigitos } from 'app/utils/instagram';
import { mensagemErro } from 'app/utils/mensagem-erro';

@Component({
    standalone: true,
    selector: 'membro-details',
    templateUrl: './membro-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class MembroDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é atualizado por Inativar/Ativar).
    membro?: Membro;
    funcoes = FUNCAO_MEMBRO;
    salvando = false;
    acaoEmAndamento = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: MembroService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
    ) { }

    get ehNovo(): boolean {
        return !this.membro?.Id;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            MEM_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            MEM_FUNCAO: [null as number | null, [Validators.required]],
            MEM_INSTAGRAM: ['', [instagramValido]],
            MEM_EMAIL: ['', [emailTolerante, Validators.maxLength(150)]],
            MEM_TELEFONE: [''],
            MEM_OBSERVACOES: ['', [Validators.maxLength(2000)]],
        });

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const m = data['data']?.membro as Membro | undefined;
            this.membro = m;
            this.form.reset({
                MEM_NOME: m?.MEM_NOME ?? '',
                MEM_FUNCAO: m?.MEM_FUNCAO ?? null,
                MEM_INSTAGRAM: m?.MEM_INSTAGRAM ?? '',
                MEM_EMAIL: m?.MEM_EMAIL ?? '',
                MEM_TELEFONE: m?.MEM_TELEFONE ?? '',
                MEM_OBSERVACOES: m?.MEM_OBSERVACOES ?? '',
            });
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
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }

        const v = this.form.getRawValue();
        // Instagram sem "@", telefone só com dígitos; opcional vazio vai como null.
        const body: Membro = {
            Id: this.membro?.Id,
            MEM_NOME: (v.MEM_NOME ?? '').trim(),
            MEM_FUNCAO: v.MEM_FUNCAO,
            MEM_INSTAGRAM: limparInstagram(v.MEM_INSTAGRAM) || null,
            MEM_EMAIL: normalizarEmail(v.MEM_EMAIL) || null,
            MEM_TELEFONE: somenteDigitos(v.MEM_TELEFONE) || null,
            MEM_OBSERVACOES: (v.MEM_OBSERVACOES ?? '').trim() || null,
        };

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
            'Inativar membro',
            `Inativar ${this.membro?.MEM_NOME}? Ele deixa de aparecer nas opções de novas escalas, mas pode ser reativado depois.`,
            'Inativar', 'warn', 'heroicons_outline:no-symbol',
            () => this._service.Inativar(this.membro!.Id!), 'Membro inativado.', 'Não foi possível inativar o membro.',
        );
    }

    ativar(): void {
        this.confirmar(
            'Ativar membro',
            `Ativar ${this.membro?.MEM_NOME}?`,
            'Ativar', 'primary', 'heroicons_outline:check-circle',
            () => this._service.Ativar(this.membro!.Id!), 'Membro ativado.', 'Não foi possível ativar o membro.',
        );
    }

    // Uma mensagem por campo.
    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['email']) { return 'E-mail inválido.'; }
        if (e['instagram']) { return 'Use só letras, números, ponto e sublinhado.'; }
        if (e['mask']) { return 'Telefone incompleto (DDD + número).'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    private confirmar(
        title: string, message: string, rotuloOk: string, cor: 'primary' | 'warn', icone: string,
        acao: () => Observable<Membro>, sucesso: string, padrao: string,
    ): void {
        if (this.acaoEmAndamento || !this.membro?.Id) {
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
                    this.membro = atualizado;
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
        this._snackBar.open('Membro salvo com sucesso.', 'X', { duration: 4000 });
        this._service.NotificarAlteracao();
        this.voltar();
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o membro.'), 'X', { duration: 6000 });
    }
}
