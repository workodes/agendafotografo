import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Observable, Subject, takeUntil } from 'rxjs';
import { Assinante } from 'app/models/entities/Assinante';
import { AssinanteService } from 'app/services/assinante.service';
import { GenericValidator } from 'app/utils/GenericValidator';
import { emailTolerante } from 'app/utils/email-validator';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { AssinanteAcoesService } from '../assinante-acoes.service';
import { abrirSenhaTemporaria } from '../senha-temporaria-dialog/senha-temporaria-dialog.component';

// Mesma regra da API (TelefonePolicy): DDD + número = 10 ou 11 dígitos; vazio é válido (campo opcional).
function telefoneValido(control: AbstractControl): ValidationErrors | null {
    const digitos = String(control.value ?? '').replace(/\D/g, '');
    return !digitos || digitos.length === 10 || digitos.length === 11 ? null : { telefone: true };
}

@Component({
    standalone: true,
    selector: 'assinante-details',
    templateUrl: './assinante-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class AssinanteDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é atualizado pelas ações Bloquear/Reativar/Redefinir).
    assinante?: Assinante;
    salvando = false;
    acaoEmAndamento = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: AssinanteService,
        private _acoes: AssinanteAcoesService,
        private _dialog: MatDialog,
        private _snackBar: MatSnackBar,
    ) { }

    get ehNovo(): boolean {
        return !this.assinante?.Id;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            ASS_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            ASS_EMAIL: ['', [Validators.required, emailTolerante, Validators.maxLength(200)]],
            // Mesma regra da API: CPF (11 dígitos) ou CNPJ (14) com dígitos verificadores corretos; opcional.
            ASS_CPF_CNPJ: ['', [GenericValidator.isValidCpfOrCnpj()]],
            ASS_TELEFONE: ['', [telefoneValido]],
        });

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const assinante = data['data']?.assinante as Assinante | undefined;
            if (assinante) {
                this.assinante = assinante;
                this.form.reset({
                    ASS_NOME: assinante.ASS_NOME,
                    ASS_EMAIL: assinante.ASS_EMAIL,
                    ASS_CPF_CNPJ: assinante.ASS_CPF_CNPJ ?? '',
                    ASS_TELEFONE: assinante.ASS_TELEFONE ?? '',
                });
            } else {
                this.assinante = undefined;
                this.form.reset({ ASS_NOME: '', ASS_EMAIL: '', ASS_CPF_CNPJ: '', ASS_TELEFONE: '' });
            }
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
        const body: Assinante = {
            Id: this.assinante?.Id,
            ASS_NOME: (v.ASS_NOME ?? '').trim(),
            ASS_EMAIL: (v.ASS_EMAIL ?? '').trim(),
            ASS_CPF_CNPJ: v.ASS_CPF_CNPJ || null,
            ASS_TELEFONE: v.ASS_TELEFONE || null,
        };

        this.salvando = true;
        if (body.Id) {
            this._service.Update(body).subscribe({
                next: () => {
                    this.salvando = false;
                    this._snackBar.open('Assinante salvo com sucesso.', 'X', { duration: 4000 });
                    this._service.NotificarAlteracao();
                    this.voltar();
                },
                error: error => this.falhaAoSalvar(error),
            });
            return;
        }

        delete body.Id;
        this._service.Add(body).subscribe({
            next: resp => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                // A senha temporária aparece uma única vez, neste modal; não é guardada em lugar nenhum.
                abrirSenhaTemporaria(this._dialog, resp.Assinante.ASS_NOME, resp.Assinante.ASS_EMAIL, resp.SenhaTemporaria);
                this._snackBar.open('Assinante criado com sucesso.', 'X', { duration: 4000 });
                this.voltar();
            },
            error: error => this.falhaAoSalvar(error),
        });
    }

    bloquear(): void {
        this.executar(this._acoes.bloquear(this.assinante as any));
    }

    reativar(): void {
        this.executar(this._acoes.reativar(this.assinante as any));
    }

    redefinirAcesso(): void {
        this.executar(this._acoes.redefinirAcesso(this.assinante as any));
    }

    // Uma mensagem por campo.
    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['email']) { return 'E-mail inválido.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        if (e['telefone']) { return 'Telefone inválido (informe DDD + número).'; }
        if (e['cpfOrCnpjNotValid']) { return 'CPF/CNPJ inválido.'; }
        if (e['mask']) { return nome === 'ASS_TELEFONE' ? 'Telefone incompleto (DDD + número).' : 'CPF/CNPJ incompleto.'; }
        return 'Valor inválido.';
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    private executar(acao: Observable<Assinante>): void {
        if (this.acaoEmAndamento) {
            return;
        }
        this.acaoEmAndamento = true;
        acao.subscribe({
            next: atualizado => {
                this.assinante = atualizado;
                this.acaoEmAndamento = false;
            },
            error: () => (this.acaoEmAndamento = false),
            complete: () => (this.acaoEmAndamento = false),
        });
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o assinante.'), 'X', { duration: 6000 });
    }
}
