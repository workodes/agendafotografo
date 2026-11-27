import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, FormRecord, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ModuloCatalogoItem, ModulosCatalogo } from 'app/models/DTOs/responses/ModulosCatalogo';
import { Plano } from 'app/models/entities/Plano';
import { RECORRENCIA_PLANO, RecorrenciaPlano } from 'app/models/enums/RecorrenciaPlano';
import { PlanoService } from 'app/services/plano.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { lerValor } from 'app/utils/moeda';
import { VALOR_MAXIMO } from 'app/utils/valor-validator';
import { ModulosPlanoComponent } from '../modulos-plano/modulos-plano.component';
import { PlanoAcoesService } from '../plano-acoes.service';

// Valor do plano: obrigatório, de 0 a 99.999.999,99 (só exibição; o zero vale). O campo usa máscara e pode guardar texto ou número.
function valorPlanoValido(c: AbstractControl): ValidationErrors | null {
    const bruto = c.value;
    if (bruto === null || bruto === undefined || bruto === '') {
        return { required: true };
    }
    const n = lerValor(bruto);
    if (n === null || n < 0) {
        return { valorInvalido: true };
    }
    return n > VALOR_MAXIMO ? { valorMaximo: true } : null;
}

// Ficha do plano (Admin, plano 24), aberta no MatDrawer da lista: nome, valor, recorrência, os módulos liberados (cartões) e a
// seção recolhida da vitrine na landing (campos guardados, ainda não exibidos). Inativar/Ativar e Excluir à esquerda do rodapé.
@Component({
    standalone: true,
    selector: 'plano-details',
    templateUrl: './plano-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule, MatSlideToggleModule,
        ModulosPlanoComponent,
    ],
})
export class PlanoDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    /** Texto de cada módulo na vitrine (um controle por módulo do catálogo; só os liberados são enviados). */
    textos = new FormRecord<FormControl<string | null>>({});
    // Preenchido na edição (vem do resolver e é atualizado por Inativar/Ativar).
    plano?: Plano;
    catalogo: ModuloCatalogoItem[] = [];
    sempreLiberados: string[] = [];
    /** Módulos liberados (estado da tela; vai no body como Modulos). */
    modulos: number[] = [];
    vitrineAberta = false;
    readonly recorrencias = RECORRENCIA_PLANO;
    salvando = false;
    acaoEmAndamento = false;
    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: PlanoService,
        private _acoes: PlanoAcoesService,
        private _snackBar: MatSnackBar,
        private _title: Title,
    ) { }

    get ehNovo(): boolean {
        return !this.plano?.Id;
    }

    get podeExcluir(): boolean {
        return !this.ehNovo && !this.plano?.PadraoAutocadastro && (this.plano?.QtdAssinantes ?? 0) === 0;
    }

    /** Módulos liberados, na ordem do catálogo (campos de texto da vitrine). */
    get modulosLiberados(): ModuloCatalogoItem[] {
        return this.catalogo.filter(m => this.modulos.includes(m.Modulo));
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            PLA_NOME: ['', [Validators.required, Validators.maxLength(100)]],
            PLA_VALOR: [null as number | string | null, [valorPlanoValido]],
            PLA_RECORRENCIA: [RecorrenciaPlano.Mensal as number, [Validators.required]],
            PLA_MOSTRAR_LANDING: [false],
            PLA_DESCRICAO: ['', [Validators.maxLength(300)]],
            PLA_ORDEM: [0 as number | null, [Validators.required, Validators.min(0), Validators.max(999), Validators.pattern(/^\d+$/)]],
            PLA_DESTAQUE: [false],
        });

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const d = data['data'];
            const catalogo = d?.catalogo as ModulosCatalogo | undefined;
            this.catalogo = catalogo?.Liberaveis ?? [];
            this.sempreLiberados = catalogo?.SempreLiberados ?? [];
            this.montarTextos();

            const plano = d?.plano as Plano | null | undefined;
            this.plano = plano ?? undefined;
            this.modulos = (plano?.Modulos ?? []).map(m => m.PLM_MODULO).sort((a, b) => a - b);
            this.form.reset({
                PLA_NOME: plano?.PLA_NOME ?? '',
                PLA_VALOR: plano ? plano.PLA_VALOR : null,
                PLA_RECORRENCIA: plano?.PLA_RECORRENCIA ?? RecorrenciaPlano.Mensal,
                PLA_MOSTRAR_LANDING: plano?.PLA_MOSTRAR_LANDING ?? false,
                PLA_DESCRICAO: plano?.PLA_DESCRICAO ?? '',
                PLA_ORDEM: plano?.PLA_ORDEM ?? 0,
                PLA_DESTAQUE: plano?.PLA_DESTAQUE ?? false,
            });
            (plano?.Modulos ?? []).forEach(m => this.textos.get(String(m.PLM_MODULO))?.setValue(m.PLM_TEXTO_LANDING ?? ''));
            this.vitrineAberta = false;
            this._title.setTitle(plano ? `Plano: ${plano.PLA_NOME}` : 'Novo plano');
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    aoMudarModulos(lista: number[]): void {
        this.modulos = lista;
    }

    alternarVitrine(): void {
        this.vitrineAberta = !this.vitrineAberta;
    }

    controleTexto(modulo: number): FormControl<string | null> {
        return this.textos.get(String(modulo)) as FormControl<string | null>;
    }

    salvar(): void {
        if (this.salvando) {
            return;
        }
        // Espaços não contam: o nome é aparado antes de validar (a API também faz Trim).
        const nome = (this.form.get('PLA_NOME')?.value ?? '').trim();
        this.form.get('PLA_NOME')?.setValue(nome);
        const textosInvalidos = this.modulosLiberados.some(m => this.controleTexto(m.Modulo)?.invalid);
        if (this.form.invalid || textosInvalidos) {
            this.form.markAllAsTouched();
            this.textos.markAllAsTouched();
            // Erro só nos campos da vitrine: abre a seção para a pessoa ver.
            const erroNaVitrine = textosInvalidos || ['PLA_DESCRICAO', 'PLA_ORDEM'].some(c => this.form.get(c)?.invalid);
            if (erroNaVitrine) {
                this.vitrineAberta = true;
            }
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }

        const v = this.form.getRawValue();
        const body: Plano = {
            Id: this.plano?.Id ?? null,
            PLA_NOME: nome,
            PLA_VALOR: lerValor(v.PLA_VALOR) ?? 0,
            PLA_RECORRENCIA: Number(v.PLA_RECORRENCIA),
            PLA_MOSTRAR_LANDING: !!v.PLA_MOSTRAR_LANDING,
            PLA_DESCRICAO: (v.PLA_DESCRICAO ?? '').trim() || null,
            PLA_ORDEM: Number(v.PLA_ORDEM ?? 0),
            PLA_DESTAQUE: !!v.PLA_DESTAQUE,
            Modulos: this.modulos.map(m => ({
                PLM_MODULO: m,
                PLM_TEXTO_LANDING: (this.controleTexto(m)?.value ?? '').trim() || null,
            })),
        };

        this.salvando = true;
        const chamada = body.Id ? this._service.Update(body) : this._service.Add({ ...body, Id: null });
        chamada.subscribe({
            next: () => {
                this.salvando = false;
                this._snackBar.open('Plano salvo com sucesso.', 'X', { duration: 4000 });
                this._service.NotificarAlteracao();
                this.voltar();
            },
            error: error => {
                this.salvando = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o plano.'), 'X', { duration: 6000 });
            },
        });
    }

    inativar(): void {
        this.executar(this._acoes.inativar(this.plano!));
    }

    ativar(): void {
        this.executar(this._acoes.ativar(this.plano!));
    }

    excluir(): void {
        if (this.acaoEmAndamento || !this.plano?.Id) {
            return;
        }
        this.acaoEmAndamento = true;
        this._acoes.excluir(this.plano).subscribe({
            next: () => {
                this.acaoEmAndamento = false;
                this.voltar();
            },
            error: () => (this.acaoEmAndamento = false),
            complete: () => (this.acaoEmAndamento = false),
        });
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return nome === 'PLA_VALOR' ? 'Informe o valor (pode ser 0,00).' : 'Campo obrigatório.'; }
        if (e['valorInvalido']) { return 'Valor inválido.'; }
        if (e['valorMaximo']) { return 'O valor máximo é R$ 99.999.999,99.'; }
        if (e['min'] || e['max'] || e['pattern']) { return 'Informe um número de 0 a 999.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    erroTexto(modulo: number): string {
        const e = this.controleTexto(modulo)?.errors;
        if (e?.['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return e ? 'Valor inválido.' : '';
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    // Um controle de texto por módulo do catálogo (módulo desligado guarda o texto digitado, mas não é enviado).
    private montarTextos(): void {
        Object.keys(this.textos.controls).forEach(k => this.textos.removeControl(k));
        this.catalogo.forEach(m => this.textos.addControl(String(m.Modulo), new FormControl<string | null>('', [Validators.maxLength(150)])));
    }

    // Inativar/Ativar: atualiza só o selo e os botões (o formulário não é repopulado, para não perder edições em andamento).
    private executar(acao: Observable<Plano>): void {
        if (this.acaoEmAndamento || !this.plano?.Id) {
            return;
        }
        this.acaoEmAndamento = true;
        acao.subscribe({
            next: atualizado => {
                this.plano = { ...this.plano!, PLA_ATIVO: atualizado.PLA_ATIVO, QtdAssinantes: atualizado.QtdAssinantes };
                this.acaoEmAndamento = false;
            },
            error: () => (this.acaoEmAndamento = false),
            complete: () => (this.acaoEmAndamento = false),
        });
    }
}
