import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Observable, Subject, Subscription, filter, takeUntil } from 'rxjs';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { Organizador } from 'app/models/entities/Organizador';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO } from 'app/models/enums/StatusEvento';
import { EventoService } from 'app/services/evento.service';
import { OrganizadorService } from 'app/services/organizador.service';
import { diaSemanaCurto, formatarData, formatarHora } from 'app/utils/data-evento';
import { emailTolerante, normalizarEmail } from 'app/utils/email-validator';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';

// Instagram: o usuário pode digitar ou colar com "@" e espaços; a API remove TODOS os espaços e o "@" do início, e só ponto,
// sublinhado, letras e números valem. O front faz o mesmo antes de validar e de enviar.
function limparInstagram(valor: string | null | undefined): string {
    return (valor ?? '').replace(/\s+/g, '').replace(/^@+/, '');
}

function instagramValido(control: AbstractControl): ValidationErrors | null {
    const v = limparInstagram(control.value);
    if (v.length > 100) { return { maxlength: { requiredLength: 100, actualLength: v.length } }; }
    return !v || /^[A-Za-z0-9._]+$/.test(v) ? null : { instagram: true };
}

const somenteDigitos = (v: string | null | undefined): string => (v ?? '').replace(/\D/g, '');

@Component({
    standalone: true,
    selector: 'organizador-details',
    templateUrl: './organizador-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, RouterLink, NgxMaskDirective,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule,
    ],
})
export class OrganizadorDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é atualizado por Inativar/Ativar).
    organizador?: Organizador;
    salvando = false;
    acaoEmAndamento = false;

    // Histórico de eventos do organizador (só na edição): os mais recentes primeiro, sem limite de data.
    historico: EventoListItem[] = [];
    historicoTotal = 0;
    carregandoHistorico = false;
    erroHistorico = '';
    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;
    formatarData = formatarData;
    diaSemanaCurto = diaSemanaCurto;
    formatarHora = formatarHora;

    private _destroy$ = new Subject<void>();
    private _requisicaoHistorico?: Subscription;

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: OrganizadorService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
        private _eventoService: EventoService,
    ) { }

    get ehNovo(): boolean {
        return !this.organizador?.Id;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            ORG_NOME: ['', [Validators.required, Validators.maxLength(200)]],
            ORG_CONTATO: ['', [Validators.maxLength(150)]],
            ORG_EMAIL: ['', [emailTolerante, Validators.maxLength(200)]],
            ORG_TELEFONE: [''],
            ORG_INSTAGRAM: ['', [instagramValido]],
            ORG_NOTAS: ['', [Validators.maxLength(2000)]],
        });

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const m = data['data']?.organizador as Organizador | undefined;
            this.organizador = m;
            this.form.reset({
                ORG_NOME: m?.ORG_NOME ?? '',
                ORG_CONTATO: m?.ORG_CONTATO ?? '',
                ORG_EMAIL: m?.ORG_EMAIL ?? '',
                ORG_TELEFONE: m?.ORG_TELEFONE ?? '',
                ORG_INSTAGRAM: m?.ORG_INSTAGRAM ?? '',
                ORG_NOTAS: m?.ORG_NOTAS ?? '',
            });
            this.carregarHistorico(m?.Id);
        });
    }

    ngOnDestroy(): void {
        this._requisicaoHistorico?.unsubscribe();
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
        const body: Organizador = {
            Id: this.organizador?.Id,
            ORG_NOME: (v.ORG_NOME ?? '').trim(),
            ORG_CONTATO: (v.ORG_CONTATO ?? '').trim() || null,
            ORG_EMAIL: normalizarEmail(v.ORG_EMAIL) || null,
            ORG_TELEFONE: somenteDigitos(v.ORG_TELEFONE) || null,
            ORG_INSTAGRAM: limparInstagram(v.ORG_INSTAGRAM) || null,
            ORG_NOTAS: (v.ORG_NOTAS ?? '').trim() || null,
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
            'Inativar organizador',
            `Inativar ${this.organizador?.ORG_NOME}? Ele deixa de aparecer nas opções de novos eventos, mas pode ser reativado depois.`,
            'Inativar', 'warn', 'heroicons_outline:no-symbol',
            () => this._service.Inativar(this.organizador!.Id!), 'Organizador inativado.', 'Não foi possível inativar o organizador.',
        );
    }

    ativar(): void {
        this.confirmar(
            'Ativar organizador',
            `Ativar ${this.organizador?.ORG_NOME}?`,
            'Ativar', 'primary', 'heroicons_outline:check-circle',
            () => this._service.Ativar(this.organizador!.Id!), 'Organizador ativado.', 'Não foi possível ativar o organizador.',
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

    // dataDe vazio = sem limite de data; ordem desc (mais recentes primeiro). Usa Evento/Listar, sem action nova.
    private carregarHistorico(organizadorId?: string): void {
        this._requisicaoHistorico?.unsubscribe();
        this.historico = [];
        this.historicoTotal = 0;
        this.erroHistorico = '';
        if (!organizadorId) {
            this.carregandoHistorico = false;
            return;
        }
        this.carregandoHistorico = true;
        this._requisicaoHistorico = this._eventoService.GetAllPaginated(1, 25, { organizadorId, ordem: 'desc' }).subscribe({
            next: resp => {
                this.historico = resp.Data ?? [];
                this.historicoTotal = resp.TotalCount ?? 0;
                this.carregandoHistorico = false;
            },
            error: error => {
                this.carregandoHistorico = false;
                this.erroHistorico = mensagemErro(error, 'Não foi possível carregar o histórico.');
            },
        });
    }

    // "@instagram" (ou o nome, sem Instagram) de cada escalado.
    equipe(e: EventoListItem): string {
        return (e.Equipe ?? []).map(m => (m.MEM_INSTAGRAM ? '@' + m.MEM_INSTAGRAM : m.MEM_NOME)).join(', ');
    }

    // Abre a ficha do evento (Ctrl/Cmd+clique abre em nova guia).
    abrirEvento(e: EventoListItem, event?: MouseEvent): void {
        abrirRota(this._router, this._route, ['/assinante/eventos', e.Id], event);
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    private confirmar(
        title: string, message: string, rotuloOk: string, cor: 'primary' | 'warn', icone: string,
        acao: () => Observable<Organizador>, sucesso: string, padrao: string,
    ): void {
        if (this.acaoEmAndamento || !this.organizador?.Id) {
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
                    this.organizador = atualizado;
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
        this._snackBar.open('Organizador salvo com sucesso.', 'X', { duration: 4000 });
        this._service.NotificarAlteracao();
        this.voltar();
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o organizador.'), 'X', { duration: 6000 });
    }
}
