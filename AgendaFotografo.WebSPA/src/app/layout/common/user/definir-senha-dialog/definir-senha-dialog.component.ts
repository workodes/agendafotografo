import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from 'app/core/auth/auth.service';
import { UsuarioService } from 'app/core/services/usuario.service';
import { CodigoEnvioResponse } from 'app/models/DTOs/responses/CodigoEnvio';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { take } from 'rxjs';

const SEGUNDOS_REENVIO = 60;

function senhasIguais(group: AbstractControl): ValidationErrors | null {
    return group.get('NovaSenha')?.value === group.get('Confirmar')?.value ? null : { diferentes: true };
}

type Passo = 'carregando' | 'indisponivel' | 'enviar' | 'codigo';

/**
 * Plano 19: conta sem senha (criada pelo Google) define uma senha provando o e-mail com um código de 6 números.
 * Código e senhas só vivem no formulário em memória e são apagados ao fechar.
 */
@Component({
    selector: 'app-definir-senha-dialog',
    templateUrl: './definir-senha-dialog.component.html',
    standalone: true,
    imports: [NgIf, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
})
export class DefinirSenhaDialogComponent implements OnInit, OnDestroy {
    passo: Passo = 'carregando';
    email = '';
    ocupado = false;
    erro = '';
    avisoEnvio = false;
    destacarReenvio = false;
    segundos = 0;
    mostrarNova = false;
    mostrarConfirmar = false;
    enviado = false;

    form = this.fb.group({
        Codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        NovaSenha: ['', [Validators.required, Validators.minLength(8)]],
        Confirmar: ['', [Validators.required]],
    }, { validators: senhasIguais });

    private _timer?: ReturnType<typeof setInterval>;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private usuarioService: UsuarioService,
        private dialogRef: MatDialogRef<DefinirSenhaDialogComponent>,
        private snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this.usuarioService.usuario$.pipe(take(1)).subscribe(u => this.email = u?.Email ?? '');
        this.authService.ConfiguracaoLogin().subscribe({
            next: c => {
                this.passo = c.EmailLigado === false ? 'indisponivel' : 'enviar';
                this._cdr.markForCheck();
            },
            // Falha na consulta: segue ao passo 1 (a API responde se o e-mail estiver desligado).
            error: () => {
                this.passo = 'enviar';
                this._cdr.markForCheck();
            },
        });
    }

    ngOnDestroy(): void {
        this.pararContagem();
        this.form.reset();
    }

    private definirOcupado(valor: boolean): void {
        this.ocupado = valor;
        this.dialogRef.disableClose = valor;
        this._cdr.markForCheck();
    }

    fechar(): void {
        if (this.ocupado)
            return;
        this.form.reset();
        this.dialogRef.close(false);
    }

    irParaCodigo(): void {
        this.erro = '';
        this.passo = 'codigo';
    }

    /** Passo 1 e reenvio do passo 2. */
    enviarCodigo(): void {
        if (this.ocupado || this.segundos > 0)
            return;

        this.erro = '';
        this.avisoEnvio = false;
        this.definirOcupado(true);
        this.authService.SolicitarCodigoDefinirSenha().subscribe({
            next: (r: CodigoEnvioResponse) => {
                this.definirOcupado(false);
                if (r.Email)
                    this.email = r.Email;
                this.avisoEnvio = r.EnvioFalhou;
                if (r.EnvioFalhou) {
                    // Falha de envio: o código foi descartado e um novo pedido já está liberado.
                    this.pararContagem();
                    this.segundos = 0;
                    return;
                }
                this.destacarReenvio = false;
                this.passo = 'codigo';
                this.iniciarContagem(r.ReenviarEmSegundos || SEGUNDOS_REENVIO);
            },
            error: error => {
                this.definirOcupado(false);
                this.erro = mensagemErro(error, 'Não foi possível enviar o código. Tente de novo.');
            },
        });
    }

    aoDigitarCodigo(evento: Event): void {
        const el = evento.target as HTMLInputElement;
        const digitos = el.value.replace(/\D/g, '').slice(0, 6);
        el.value = digitos;
        this.form.get('Codigo')!.setValue(digitos);
    }

    get senhasDiferentes(): boolean {
        const c = this.form.get('Confirmar');
        return this.form.hasError('diferentes') && !!c && !c.hasError('required') && (c.touched || this.enviado);
    }

    definir(): void {
        this.enviado = true;
        this.erro = '';
        this.form.markAllAsTouched();
        if (this.form.invalid || this.ocupado)
            return;

        const v = this.form.getRawValue();
        this.definirOcupado(true);
        this.authService.DefinirSenha({ Codigo: v.Codigo!, NovaSenha: v.NovaSenha! }).subscribe({
            next: r => {
                this.authService.ConcluirDefinicaoSenha();
                this.snackBar.open(r?.Message || 'Senha definida.', 'X', { duration: 6000 });
                this.form.reset();
                this.dialogRef.disableClose = false;
                this.dialogRef.close(true);
            },
            error: error => {
                this.definirOcupado(false);
                this.erro = mensagemErro(error, 'Não foi possível definir a senha. Tente de novo.');
                const texto = this.erro;
                if (/Código incorreto|não vale mais|venceu/i.test(texto)) {
                    // Limpa só o código; as senhas ficam.
                    this.form.get('Codigo')!.reset('');
                    this.enviado = false;
                    this.destacarReenvio = /não vale mais|venceu/i.test(texto);
                }
            },
        });
    }

    private iniciarContagem(total: number): void {
        this.pararContagem();
        this.segundos = total;
        this._timer = setInterval(() => {
            this.segundos--;
            if (this.segundos <= 0) {
                this.segundos = 0;
                this.pararContagem();
            }
            this._cdr.markForCheck();
        }, 1000);
    }

    private pararContagem(): void {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = undefined;
        }
    }
}
