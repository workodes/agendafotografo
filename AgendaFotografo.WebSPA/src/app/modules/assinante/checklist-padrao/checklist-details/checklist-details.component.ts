import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subject, filter, takeUntil } from 'rxjs';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { PendenciaModelo } from 'app/models/entities/PendenciaModelo';
import { CATEGORIA_PENDENCIA, CategoriaPendencia } from 'app/models/enums/CategoriaPendencia';
import { PRIORIDADE_PENDENCIA, PrioridadePendencia } from 'app/models/enums/PrioridadePendencia';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { PendenciaModeloService } from 'app/services/pendencia-modelo.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import {
    DIAS_PRAZO_MAX_ANTES, DIAS_PRAZO_MAX_DEPOIS, TipoPrazoModelo, controlesParaPrazo, prazoParaControles,
} from 'app/utils/pendencia';

// Número inteiro (o input number aceita decimais).
function inteiro(c: AbstractControl): ValidationErrors | null {
    const v = c.value;
    return v == null || v === '' || Number.isInteger(Number(v)) ? null : { inteiro: true };
}

@Component({
    standalone: true,
    selector: 'checklist-details',
    templateUrl: './checklist-details.component.html',
    host: { class: 'flex flex-col flex-auto min-h-0 h-full w-full px-4 sm:px-6 md:px-8 pb-6' },
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
        CustomSearchSelectComponent,
    ],
})
export class ChecklistDetailsComponent implements OnInit, OnDestroy {
    form: FormGroup;
    // Preenchido na edição (vem do resolver e é recarregado por Inativar/Ativar).
    modelo?: PendenciaModelo | null;
    salvando = false;
    acaoEmAndamento = false;

    categorias = CATEGORIA_PENDENCIA;
    prioridades = PRIORIDADE_PENDENCIA;
    tiposPrazo: { valor: TipoPrazoModelo; rotulo: string }[] = [
        { valor: 'sem', rotulo: 'Sem prazo' },
        { valor: 'antes', rotulo: 'Antes do evento' },
        { valor: 'depois', rotulo: 'Depois do evento' },
    ];
    maxAntes = DIAS_PRAZO_MAX_ANTES;
    maxDepois = DIAS_PRAZO_MAX_DEPOIS;

    tipos: Opcao[] = [];
    private _tiposSel = new OpcoesSelect<Opcao>(t => t.Id, t => t.Nome);
    get tiposOpcoes() { return this._tiposSel.de(this.tipos); }

    private _destroy$ = new Subject<void>();

    constructor(
        private _fb: FormBuilder,
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: PendenciaModeloService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
    ) { }

    get ehNovo(): boolean {
        return !this.modelo?.Id;
    }

    get tipoPrazo(): TipoPrazoModelo {
        return this.form.get('tipoPrazo')!.value;
    }

    ngOnInit(): void {
        this.form = this._fb.group({
            PEM_TITULO: ['', [Validators.required, Validators.maxLength(200)]],
            PEM_CATEGORIA: [CategoriaPendencia.Outros as number, [Validators.required]],
            PEM_PRIORIDADE: [PrioridadePendencia.Media as number, [Validators.required]],
            tipoPrazo: ['sem' as TipoPrazoModelo],
            diasPrazo: [{ value: null as number | null, disabled: true }],
            PEM_TIPO_EVENTO_ID: [null as string | null],
        });

        // O número de dias só vale com "Antes" ou "Depois" (faixas da API: 0 a 365 antes, 1 a 90 depois).
        this.form.get('tipoPrazo')!.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(t => this.ajustarDias(t));

        // Reage a mudanças de rota (:id -> outro :id, ou :id -> novo) reaproveitando o componente.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            this.tipos = data['data']?.tipos ?? [];
            this.preencher((data['data']?.modelo as PendenciaModelo | null | undefined) ?? null);
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
        // Espaços não contam: o título é aparado antes de validar (a API também faz Trim).
        const titulo = (this.form.get('PEM_TITULO')?.value ?? '').trim();
        this.form.get('PEM_TITULO')?.setValue(titulo);
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this._snackBar.open('Verifique os campos destacados em vermelho antes de salvar.', 'X', { duration: 5000 });
            return;
        }

        const v = this.form.getRawValue();
        const dias = v.diasPrazo === null || v.diasPrazo === '' ? null : Number(v.diasPrazo);
        const body: PendenciaModelo = {
            Id: this.modelo?.Id,
            PEM_TITULO: titulo,
            PEM_CATEGORIA: v.PEM_CATEGORIA,
            PEM_PRIORIDADE: v.PEM_PRIORIDADE,
            PEM_DIAS_ANTES: controlesParaPrazo(v.tipoPrazo, dias),
            PEM_TIPO_EVENTO_ID: v.PEM_TIPO_EVENTO_ID || null,
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
            'Inativar item do checklist',
            `Inativar "${this.modelo?.PEM_TITULO}"? Ele deixa de ser adicionado aos próximos eventos. As pendências já criadas continuam como estão.`,
            'Inativar', 'warn', 'heroicons_outline:no-symbol',
            id => this._service.Inativar(id), 'Item do checklist inativado.', 'Não foi possível inativar o item do checklist.',
        );
    }

    ativar(): void {
        this.confirmar(
            'Ativar item do checklist',
            `Ativar "${this.modelo?.PEM_TITULO}"? Ele volta a ser adicionado aos eventos novos.`,
            'Ativar', 'primary', 'heroicons_outline:check-circle',
            id => this._service.Ativar(id), 'Item do checklist ativado.', 'Não foi possível ativar o item do checklist.',
        );
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    // Mensagem do número de dias conforme o tipo de prazo ("Antes": 0 a 365; "Depois": 1 a 90).
    erroDias(): string {
        const e = this.form.get('diasPrazo')?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Informe os dias.'; }
        if (e['inteiro']) { return 'Informe um número inteiro.'; }
        return this.tipoPrazo === 'antes' ? `Use de 0 a ${this.maxAntes} dias.` : `Use de 1 a ${this.maxDepois} dias.`;
    }

    voltar(): void {
        this._router.navigate(['../'], { relativeTo: this._route });
    }

    private preencher(modelo: PendenciaModelo | null): void {
        this.modelo = modelo;
        const prazo = prazoParaControles(modelo?.PEM_DIAS_ANTES);
        this.form.reset({
            PEM_TITULO: modelo?.PEM_TITULO ?? '',
            PEM_CATEGORIA: modelo?.PEM_CATEGORIA ?? CategoriaPendencia.Outros,
            PEM_PRIORIDADE: modelo?.PEM_PRIORIDADE ?? PrioridadePendencia.Media,
            tipoPrazo: prazo.tipo,
            diasPrazo: prazo.dias,
            PEM_TIPO_EVENTO_ID: modelo?.PEM_TIPO_EVENTO_ID ?? null,
        });
        this.ajustarDias(prazo.tipo);
    }

    private ajustarDias(tipo: TipoPrazoModelo): void {
        const dias = this.form.get('diasPrazo')!;
        if (tipo === 'sem') {
            dias.clearValidators();
            dias.setValue(null, { emitEvent: false });
            dias.disable({ emitEvent: false });
        } else {
            dias.setValidators([Validators.required, inteiro, Validators.min(tipo === 'antes' ? 0 : 1), Validators.max(tipo === 'antes' ? DIAS_PRAZO_MAX_ANTES : DIAS_PRAZO_MAX_DEPOIS)]);
            dias.enable({ emitEvent: false });
        }
        dias.updateValueAndValidity({ emitEvent: false });
    }

    private confirmar(
        title: string, message: string, rotuloOk: string, cor: 'primary' | 'warn', icone: string,
        acao: (id: string) => ReturnType<PendenciaModeloService['Inativar']>, sucesso: string, padrao: string,
    ): void {
        if (this.acaoEmAndamento || !this.modelo?.Id) {
            return;
        }
        const id = this.modelo.Id;
        this._confirmacao.open({
            title,
            message,
            icon: { show: true, name: icone, color: cor },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: rotuloOk, color: cor } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.acaoEmAndamento = true;
            // Inativar/Ativar só devolvem ApiResponse: recarrega o modelo para mostrar a situação nova.
            acao(id).subscribe({
                next: () => this._service.Get(id).subscribe({
                    next: atualizado => {
                        this.modelo = atualizado;
                        this.acaoEmAndamento = false;
                        this._snackBar.open(sucesso, 'X', { duration: 4000 });
                        this._service.NotificarAlteracao();
                    },
                    error: error => {
                        this.acaoEmAndamento = false;
                        this._snackBar.open(mensagemErro(error, padrao), 'X', { duration: 6000 });
                        this._service.NotificarAlteracao();
                    },
                }),
                error: error => {
                    this.acaoEmAndamento = false;
                    this._snackBar.open(mensagemErro(error, padrao), 'X', { duration: 6000 });
                },
            });
        });
    }

    private sucessoAoSalvar(): void {
        this.salvando = false;
        this._snackBar.open('Item do checklist salvo com sucesso.', 'X', { duration: 4000 });
        this._service.NotificarAlteracao();
        this.voltar();
    }

    private falhaAoSalvar(error: any): void {
        this.salvando = false;
        this._snackBar.open(mensagemErro(error, 'Não foi possível salvar o item do checklist.'), 'X', { duration: 6000 });
    }
}
