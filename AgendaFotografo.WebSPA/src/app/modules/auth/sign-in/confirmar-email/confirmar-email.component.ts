import { NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'app/core/auth/auth.service';
import { CodigoEnvioResponse } from 'app/models/DTOs/responses/CodigoEnvio';
import { emailTolerante, normalizarEmail } from 'app/utils/email-validator';

/**
 * Etapa "Confirme seu e-mail" da tela de acesso (sem rota própria).
 * A senha chega do pai só para conferir as chamadas e o código fica só nesta propriedade (memória):
 * nunca em storage, URL, `state` da navegação ou console. Tudo é apagado ao concluir, ao voltar e no `ngOnDestroy`.
 */
@Component({
    selector: 'app-confirmar-email',
    templateUrl: './confirmar-email.component.html',
    standalone: true,
    imports: [NgIf, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
})
export class ConfirmarEmailComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input({ required: true }) email = '';
    @Input({ required: true }) senha = '';
    @Input() envioFalhou = false;
    @Input() reenviarEmSegundos = 0;
    @Output() concluido = new EventEmitter<void>();
    @Output() voltar = new EventEmitter<void>();
    @Output() emailAlterado = new EventEmitter<string>();

    @ViewChild('campoCodigo') campoCodigo?: ElementRef<HTMLInputElement>;
    @ViewChild('campoEmailNovo') campoEmailNovo?: ElementRef<HTMLInputElement>;

    codigo = '';
    erro = '';
    ocupado = false;
    segundos = 0;
    avisoLiberado = '';
    corrigindo = false;
    emailNovo = new FormControl('', [Validators.required, emailTolerante, Validators.maxLength(200)]);
    erroEmailNovo = '';
    tentouCorrigir = false;

    private _timer?: ReturnType<typeof setInterval>;
    private _ultimoEnviado = '';

    constructor(private authService: AuthService, private _cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this.iniciarContagem(this.reenviarEmSegundos);
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.campoCodigo?.nativeElement.focus());
    }

    ngOnDestroy(): void {
        this.pararContagem();
        this.codigo = '';
    }

    // ----- Código -----
    aoDigitar(evento: Event): void {
        const el = evento.target as HTMLInputElement;
        const digitos = el.value.replace(/\D/g, '').slice(0, 6);
        el.value = digitos;
        this.codigo = digitos;
        // Envia sozinho ao completar 6 números, uma vez por valor.
        if (digitos.length === 6 && digitos !== this._ultimoEnviado)
            this.confirmar();
    }

    confirmar(): void {
        if (this.ocupado)
            return;
        if (this.codigo.length !== 6) {
            this.erro = 'Digite o código de 6 números.';
            return;
        }

        this._ultimoEnviado = this.codigo;
        this.ocupado = true;
        this.erro = '';
        this.authService.ConfirmarEmail({ Email: this.email, Senha: this.senha, Codigo: this.codigo }).subscribe({
            next: () => {
                this.codigo = '';
                this.concluido.emit();
            },
            error: error => {
                this.ocupado = false;
                this.erro = (typeof error?.error === 'string' && error.error) || 'Não foi possível confirmar o e-mail.';
                this.limparCampo();
                this._cdr.markForCheck();
            },
        });
    }

    private limparCampo(): void {
        this.codigo = '';
        this._ultimoEnviado = '';
        const el = this.campoCodigo?.nativeElement;
        if (el) {
            el.value = '';
            setTimeout(() => el.focus());
        }
    }

    // ----- Reenviar -----
    reenviar(): void {
        if (this.ocupado || this.segundos > 0)
            return;

        this.ocupado = true;
        this.erro = '';
        this.authService.ReenviarCodigo({ Email: this.email, Senha: this.senha }).subscribe({
            next: r => {
                this.ocupado = false;
                this.aplicarEnvio(r);
                this.limparCampo();
                this._cdr.markForCheck();
            },
            error: error => {
                this.ocupado = false;
                this.erro = (typeof error?.error === 'string' && error.error) || 'Não foi possível reenviar o código.';
                this._cdr.markForCheck();
            },
        });
    }

    private aplicarEnvio(r: CodigoEnvioResponse): void {
        this.envioFalhou = r.EnvioFalhou;
        this.iniciarContagem(r.ReenviarEmSegundos);
    }

    // ----- Errei o e-mail -----
    abrirCorrecao(): void {
        this.corrigindo = true;
        this.erroEmailNovo = '';
        this.tentouCorrigir = false;
        this.emailNovo.reset('');
        setTimeout(() => this.campoEmailNovo?.nativeElement.focus());
    }

    cancelarCorrecao(): void {
        if (this.ocupado)
            return;
        this.corrigindo = false;
        this.erroEmailNovo = '';
    }

    corrigir(): void {
        this.tentouCorrigir = true;
        this.erroEmailNovo = '';
        if (this.ocupado)
            return;
        if (this.emailNovo.invalid) {
            this.erroEmailNovo = this.emailNovo.hasError('required') ? 'Informe o e-mail.' : 'Informe um e-mail válido.';
            return;
        }

        this.ocupado = true;
        this.authService.CorrigirEmail({
            Email: this.email,
            Senha: this.senha,
            EmailNovo: normalizarEmail(this.emailNovo.value),
        }).subscribe({
            next: r => {
                this.ocupado = false;
                this.email = r.Email;
                this.emailAlterado.emit(r.Email);
                this.corrigindo = false;
                this.erro = '';
                this.aplicarEnvio(r);
                this.limparCampo();
                this._cdr.markForCheck();
            },
            error: error => {
                this.ocupado = false;
                this.erroEmailNovo = (typeof error?.error === 'string' && error.error) || 'Não foi possível trocar o e-mail.';
                this._cdr.markForCheck();
            },
        });
    }

    // ----- Contagem do reenvio -----
    private iniciarContagem(segundos: number): void {
        this.pararContagem();
        this.avisoLiberado = '';
        this.segundos = Math.max(0, Math.min(60, Math.floor(segundos || 0)));
        if (this.segundos === 0)
            return;
        this._timer = setInterval(() => {
            this.segundos--;
            if (this.segundos <= 0) {
                this.segundos = 0;
                this.pararContagem();
                // Só aqui o leitor de tela é avisado (aria-live), sem anunciar cada segundo.
                this.avisoLiberado = 'Você já pode pedir um novo código.';
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

    sair(): void {
        if (this.ocupado)
            return;
        this.codigo = '';
        this.voltar.emit();
    }
}
