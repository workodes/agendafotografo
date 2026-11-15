import { NgIf } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'app/core/auth/auth.service';

const SEGUNDOS_REENVIO = 60;

function senhasIguais(group: AbstractControl): ValidationErrors | null {
    const a = group.get('senha')?.value;
    const b = group.get('confirmar')?.value;
    return a === b ? null : { diferentes: true };
}

/**
 * Etapa "Crie uma nova senha" (sem rota própria). Código e senha só vivem no formulário em memória:
 * nunca em storage, URL, `state` da navegação ou console; apagados ao concluir, ao voltar e no `ngOnDestroy`.
 */
@Component({
    selector: 'app-nova-senha',
    templateUrl: './nova-senha.component.html',
    standalone: true,
    imports: [NgIf, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
})
export class NovaSenhaComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) email = '';
    /** Mensagem uniforme devolvida pela API em EsqueciSenha. */
    @Input() mensagem = '';
    @Output() concluido = new EventEmitter<void>();
    @Output() voltar = new EventEmitter<void>();

    @ViewChild('campoCodigo') campoCodigo?: ElementRef<HTMLInputElement>;

    form = this.fb.group({
        codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        senha: ['', [Validators.required, Validators.minLength(8)]],
        confirmar: ['', [Validators.required]],
    }, { validators: senhasIguais });

    enviado = false;
    ocupado = false;
    erro = '';
    segundos = SEGUNDOS_REENVIO;
    avisoLiberado = '';
    info = '';

    private _timer?: ReturnType<typeof setInterval>;

    constructor(private fb: FormBuilder, private authService: AuthService, private _cdr: ChangeDetectorRef) {
        this.iniciarContagem();
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.campoCodigo?.nativeElement.focus());
    }

    ngOnDestroy(): void {
        this.pararContagem();
        this.form.reset();
    }

    aoDigitarCodigo(evento: Event): void {
        const el = evento.target as HTMLInputElement;
        const digitos = el.value.replace(/\D/g, '').slice(0, 6);
        el.value = digitos;
        this.form.get('codigo')!.setValue(digitos);
    }

    mostrar(campo: string): boolean {
        const c = this.form.get(campo);
        return !!c && c.invalid && (c.touched || this.enviado);
    }

    textoErro(campo: string): string {
        const e = this.form.get(campo)?.errors;
        if (!e) return '';
        if (e['required']) return campo === 'codigo' ? 'Digite o código de 6 números.' : 'Campo obrigatório.';
        if (e['pattern']) return 'Digite o código de 6 números.';
        if (e['minlength']) return `Mínimo de ${e['minlength'].requiredLength} caracteres.`;
        return 'Valor inválido.';
    }

    get senhasDiferentes(): boolean {
        const c = this.form.get('confirmar');
        return this.form.hasError('diferentes') && !!c && (c.touched || this.enviado) && !c.hasError('required');
    }

    salvar(): void {
        this.enviado = true;
        this.erro = '';
        if (this.form.invalid || this.ocupado)
            return;

        const v = this.form.getRawValue();
        this.ocupado = true;
        this.authService.RedefinirSenha({ Email: this.email, Codigo: v.codigo!, NovaSenha: v.senha! }).subscribe({
            next: () => {
                this.form.reset();
                this.concluido.emit();
            },
            error: error => {
                this.ocupado = false;
                this.erro = (typeof error?.error === 'string' && error.error) || 'Não foi possível criar a nova senha.';
                // Como na etapa do código: limpa o campo e devolve o foco (sem mostrar "obrigatório" de imediato).
                this.form.get('codigo')!.reset('');
                this.enviado = false;
                this._cdr.markForCheck();
                setTimeout(() => this.campoCodigo?.nativeElement.focus());
            },
        });
    }

    reenviar(): void {
        if (this.ocupado || this.segundos > 0)
            return;

        this.ocupado = true;
        this.erro = '';
        // Sempre 200 com a mesma mensagem; o prazo de 60 s é contado aqui.
        this.authService.EsqueciSenha({ Email: this.email }).subscribe({
            next: r => {
                this.ocupado = false;
                this.info = r.Message || this.mensagem;
                this.iniciarContagem();
                this._cdr.markForCheck();
            },
            error: error => {
                this.ocupado = false;
                this.erro = (typeof error?.error === 'string' && error.error) || 'Não foi possível reenviar o código.';
                this._cdr.markForCheck();
            },
        });
    }

    sair(): void {
        if (this.ocupado)
            return;
        this.form.reset();
        this.voltar.emit();
    }

    private iniciarContagem(): void {
        this.pararContagem();
        this.avisoLiberado = '';
        this.segundos = SEGUNDOS_REENVIO;
        this._timer = setInterval(() => {
            this.segundos--;
            if (this.segundos <= 0) {
                this.segundos = 0;
                this.pararContagem();
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
}
