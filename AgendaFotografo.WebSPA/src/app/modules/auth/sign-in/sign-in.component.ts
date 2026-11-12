import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { AbstractControl, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { FuseAlertType } from '@fuse/components/alert';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { GoogleIdentityService } from 'app/core/auth/google-identity.service';
import { QcAuthShellComponent } from 'app/shared/auth-shell/qc-auth-shell.component';
import { GenericValidator } from 'app/utils/GenericValidator';
import { emailTolerante, normalizarEmail } from 'app/utils/email-validator';

// Mesma regra da API: DDD + número = 10 ou 11 dígitos (aqui o campo é obrigatório, o required cobre o vazio).
function telefoneValido(control: AbstractControl): ValidationErrors | null {
    const digitos = String(control.value ?? '').replace(/\D/g, '');
    return !digitos || digitos.length === 10 || digitos.length === 11 ? null : { telefone: true };
}

type Aba = 'entrar' | 'cadastro';
type Etapa = 'abas' | 'completar';

const DIAS_GRATIS_PADRAO = 15;

/**
 * Tela pública de acesso: abas Entrar (/sign-in) e Cadastro (/sign-up), as duas neste componente
 * (`data.aba` da rota). O cadastro tem e-mail + senha ou Google; no Google a pessoa completa
 * telefone e CPF/CNPJ na etapa "Complete seu cadastro" (sem rota própria).
 * O ID token do Google fica só nesta propriedade (memória): nunca em storage, URL ou console.
 */
@Component({
    selector: 'auth-sign-in',
    templateUrl: './sign-in.component.html',
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
    standalone: true,
    providers: [provideNgxMask()],
    imports: [
        QcAuthShellComponent,
        NgIf,
        FormsModule,
        ReactiveFormsModule,
        NgxMaskDirective,
        MatIconModule,
        MatProgressSpinnerModule,
    ],
})
export class AuthSignInComponent implements OnInit, OnDestroy {
    alert: { type: FuseAlertType; message: string } = { type: 'success', message: '' };
    showAlert = false;

    aba: Aba = 'entrar';
    etapa: Etapa = 'abas';

    signInForm: UntypedFormGroup;
    cadastroForm: UntypedFormGroup;
    completarForm: UntypedFormGroup;
    enviado = { entrar: false, cadastro: false, completar: false };

    diasGratis = DIAS_GRATIS_PADRAO;
    googleClientId: string | null = null;
    googleIndisponivel = false;
    // Envio em andamento (login/cadastro/Google): desabilita botões.
    ocupado = false;

    // Etapa "completar": e-mail vem do Google (somente leitura). O ID token só existe aqui, em memória.
    emailGoogle = '';
    private _idToken: string | null = null;
    private _dadosGoogle: { telefone: string; cpfCnpj: string } | null = null;
    private _botao?: ElementRef<HTMLElement>;
    private _botaoDesenhado?: HTMLElement;
    private _destroy$ = new Subject<void>();

    // O botão do Google existe só quando há Client ID e a etapa é a das abas.
    @ViewChild('googleBotao') set googleBotao(el: ElementRef<HTMLElement> | undefined) {
        this._botao = el;
        this.desenharGoogle();
    }

    constructor(
        private authService: AuthService,
        private google: GoogleIdentityService,
        private formBuilder: UntypedFormBuilder,
        private router: Router,
        private route: ActivatedRoute,
        private _title: Title,
        private _cdr: ChangeDetectorRef,
    ) { }

    get tituloCartao(): string {
        if (this.etapa === 'completar')
            return 'Complete seu cadastro';
        return this.aba === 'entrar' ? 'Entrar' : 'Criar conta';
    }

    get subtituloCartao(): string {
        if (this.etapa === 'completar')
            return 'Falta pouco para criar a sua conta.';
        return this.aba === 'entrar' ? 'Acesse a agenda da sua equipe.' : `${this.textoDias}, sem cartão.`;
    }

    get textoDias(): string {
        return this.diasGratis === 1 ? '1 dia grátis' : `${this.diasGratis} dias grátis`;
    }

    ngOnInit(): void {
        // Título da aba do login no padrão "Página | Marca" (o mesmo do index.html); as demais telas definem o próprio título
        this._title.setTitle('Agenda Fotógrafos | QuemClica');

        this.aba = this.route.snapshot.data['aba'] === 'cadastro' ? 'cadastro' : 'entrar';

        const rememberedEmail = this.authService.rememberedEmail;

        this.signInForm = this.formBuilder.group({
            email: [rememberedEmail, [Validators.required, Validators.email]],
            password: ['', Validators.required],
            rememberMe: [!!rememberedEmail],
        });

        this.cadastroForm = this.formBuilder.group({
            nome: ['', [Validators.required, Validators.maxLength(200)]],
            email: ['', [Validators.required, emailTolerante, Validators.maxLength(200)]],
            telefone: ['', [Validators.required, telefoneValido]],
            cpfCnpj: ['', [Validators.required, GenericValidator.isValidCpfOrCnpj()]],
            senha: ['', [Validators.required, Validators.minLength(8)]],
        });

        this.completarForm = this.formBuilder.group({
            nome: ['', [Validators.required, Validators.maxLength(200)]],
            telefone: ['', [Validators.required, telefoneValido]],
            cpfCnpj: ['', [Validators.required, GenericValidator.isValidCpfOrCnpj()]],
        });

        // Client ID e dias grátis vêm da API; se falhar, o Google some e o resto funciona.
        this.authService.ConfiguracaoLogin().pipe(takeUntil(this._destroy$)).subscribe({
            next: config => {
                this.diasGratis = config.DiasGratis > 0 ? config.DiasGratis : DIAS_GRATIS_PADRAO;
                this.googleClientId = config.GoogleClientId || null;
                this._cdr.markForCheck();
            },
            error: () => { /* mantém o padrão: sem Google, 15 dias */ },
        });

        this.google.credencial$.pipe(takeUntil(this._destroy$)).subscribe(token => this.aoReceberCredencial(token));
    }

    ngOnDestroy(): void {
        this._idToken = null;
        this._destroy$.next();
        this._destroy$.complete();
    }

    trocarAba(aba: Aba): void {
        if (aba === this.aba || this.ocupado)
            return;
        // Preserva os query params (ex.: redirectURL) ao trocar de aba
        this.router.navigate([aba === 'cadastro' ? '/sign-up' : '/sign-in'], { queryParamsHandling: 'preserve' });
    }

    // ----- Entrar -----
    signIn(): void {
        this.enviado.entrar = true;
        if (this.signInForm.invalid || this.ocupado)
            return;

        this.iniciar();
        this.authService.signIn(this.signInForm.value).subscribe({
            next: () => this.entrar(),
            error: error => this.falhar(error, 'Erro ao fazer login'),
        });
    }

    // ----- Cadastro manual -----
    cadastrar(): void {
        this.enviado.cadastro = true;
        if (this.cadastroForm.invalid || this.ocupado)
            return;

        const v = this.cadastroForm.getRawValue();
        this.iniciar();
        this.authService.Cadastrar({
            ASS_NOME: (v.nome ?? '').trim(),
            ASS_EMAIL: normalizarEmail(v.email),
            ASS_TELEFONE: this.digitos(v.telefone),
            ASS_CPF_CNPJ: this.digitos(v.cpfCnpj),
            Senha: v.senha,
        }).subscribe({
            next: () => this.entrar(),
            error: error => this.falhar(error, 'Não foi possível criar a conta.'),
        });
    }

    // ----- Google -----
    private aoReceberCredencial(token: string): void {
        if (this.ocupado || this.etapa === 'completar')
            return;

        this.iniciar();
        this.authService.LoginGoogle(token).subscribe({
            next: resp => {
                if (!resp.PrecisaCompletar) {
                    this.entrar();
                    return;
                }
                // Nada foi gravado: a pessoa completa os dados e o token é reenviado ao concluir.
                this._idToken = token;
                this.emailGoogle = resp.Email ?? '';
                this.completarForm.reset({ nome: resp.Nome ?? '', telefone: this._dadosGoogle?.telefone ?? '', cpfCnpj: this._dadosGoogle?.cpfCnpj ?? '' });
                this._dadosGoogle = null;
                this.enviado.completar = false;
                this.etapa = 'completar';
                this.ocupado = false;
                this._cdr.markForCheck();
            },
            error: error => this.falhar(error, 'Não foi possível entrar com o Google.'),
        });
    }

    concluirGoogle(): void {
        this.enviado.completar = true;
        if (this.completarForm.invalid || this.ocupado || !this._idToken)
            return;

        const v = this.completarForm.getRawValue();
        this.iniciar();
        this.authService.CadastrarGoogle({
            IdToken: this._idToken,
            ASS_NOME: (v.nome ?? '').trim(),
            ASS_TELEFONE: this.digitos(v.telefone),
            ASS_CPF_CNPJ: this.digitos(v.cpfCnpj),
        }).subscribe({
            next: () => {
                this._idToken = null;
                this.entrar();
            },
            error: error => {
                // Token inválido/vencido: descarta o ID token e volta às abas (na aba em que a pessoa estava; as duas têm o
                // botão do Google), guardando telefone e CPF/CNPJ para reaproveitar quando o Google pedir para completar de novo.
                const msg = typeof error?.error === 'string' ? error.error : '';
                if (msg.includes('Não foi possível confirmar sua conta Google')) {
                    this._dadosGoogle = { telefone: v.telefone ?? '', cpfCnpj: v.cpfCnpj ?? '' };
                    this._idToken = null;
                    this.emailGoogle = '';
                    this.etapa = 'abas';
                }
                this.falhar(error, 'Não foi possível criar a conta.');
            },
        });
    }

    voltarDoGoogle(): void {
        if (this.ocupado)
            return;
        this._idToken = null;
        this.emailGoogle = '';
        this.showAlert = false;
        this.etapa = 'abas';
    }

    private desenharGoogle(): void {
        const el = this._botao?.nativeElement;
        if (!el || !this.googleClientId || el === this._botaoDesenhado)
            return;

        this._botaoDesenhado = el;
        const texto = this.aba === 'entrar' ? 'signin_with' : 'continue_with';
        this.google.desenharBotao(this.googleClientId, el, texto).then(ok => {
            this.googleIndisponivel = !ok;
            this._cdr.markForCheck();
        });
    }

    // ----- Erros em campo -----
    mostrarErro(form: UntypedFormGroup, campo: string, chave: 'entrar' | 'cadastro' | 'completar'): boolean {
        const c = form.get(campo);
        return !!c && c.invalid && (c.touched || this.enviado[chave]);
    }

    erro(form: UntypedFormGroup, campo: string): string {
        const e = form.get(campo)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['email']) { return 'Informe um e-mail válido.'; }
        if (e['minlength']) { return `Mínimo de ${e['minlength'].requiredLength} caracteres.`; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        if (e['telefone']) { return 'Telefone inválido (informe DDD + número).'; }
        if (e['cpfOrCnpjNotValid']) { return 'CPF/CNPJ inválido.'; }
        if (e['mask']) { return campo === 'telefone' ? 'Telefone incompleto (DDD + número).' : 'CPF/CNPJ incompleto.'; }
        return 'Valor inválido.';
    }

    // ----- Auxiliares -----
    private iniciar(): void {
        this.ocupado = true;
        this.showAlert = false;
    }

    private entrar(): void {
        const redirectURL = this.route.snapshot.queryParamMap.get('redirectURL');
        this.router.navigateByUrl(redirectURL || this.authService.getRotaInicial());
    }

    private falhar(error: any, padrao: string): void {
        this.ocupado = false;
        this.alert = { type: 'error', message: (typeof error?.error === 'string' && error.error) || padrao };
        this.showAlert = true;
        this._cdr.markForCheck();
    }

    private digitos(valor: string | null | undefined): string {
        return (valor ?? '').replace(/\D/g, '');
    }
}
