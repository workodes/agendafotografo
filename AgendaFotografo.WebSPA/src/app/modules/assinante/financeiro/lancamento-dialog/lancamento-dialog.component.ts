import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { filter } from 'rxjs';
import { CATEGORIA_LANCAMENTO, CategoriaLancamento } from 'app/models/enums/CategoriaLancamento';
import { TipoLancamento } from 'app/models/enums/TipoLancamento';
import { Lancamento } from 'app/models/entities/Lancamento';
import { LancamentoService } from 'app/services/lancamento.service';
import { formatarDataIso, hojeIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { lerValor } from 'app/utils/moeda';
import { valorValido } from 'app/utils/valor-validator';

export interface LancamentoDialogData {
    // Preenchido na edição (carrega por Obter).
    id?: string | null;
    // Tipo inicial de um lançamento novo (Receita ou Despesa). Padrão: Despesa.
    tipo?: number;
}

interface OpcaoTipo {
    valor: number;
    rotulo: string;
    icone: string;
    classe: string;
}

const OPCOES_TIPO: OpcaoTipo[] = [
    { valor: TipoLancamento.Receita, rotulo: 'Receita', icone: 'heroicons_outline:arrow-trending-up', classe: 'tipo-receita' },
    { valor: TipoLancamento.Despesa, rotulo: 'Despesa', icone: 'heroicons_outline:arrow-trending-down', classe: 'tipo-despesa' },
];

// Modal do lançamento (plano 22): Receita ou Despesa; criar, editar e excluir. Fecha devolvendo true quando algo mudou. Avisa o
// LancamentoService (alterado$), então a lista, os cartões e os gráficos recarregam sozinhos. Gasto fixo tem modal próprio.
@Component({
    standalone: true,
    selector: 'app-lancamento-dialog',
    templateUrl: './lancamento-dialog.component.html',
    styleUrl: './lancamento-dialog.component.scss',
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatButtonToggleModule, MatDatepickerModule, MatDialogModule, MatFormFieldModule,
        MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class LancamentoDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _ref = inject(MatDialogRef<LancamentoDialogComponent, boolean>);
    private _service = inject(LancamentoService);
    private _confirmacao = inject(FuseConfirmationService);
    readonly data = inject<LancamentoDialogData>(MAT_DIALOG_DATA);

    readonly opcoesTipo = OPCOES_TIPO;
    readonly categorias = CATEGORIA_LANCAMENTO;
    readonly dataMin = new Date(2000, 0, 1);
    readonly dataMax = new Date(2100, 11, 31);

    carregando = false;
    erroCarga = '';
    salvando = false;
    excluindo = false;
    // Erro da API (400 em texto) mostrado no próprio modal.
    erroApi = '';
    // Veio de um gasto fixo (só na edição).
    gerado = false;

    form = this._fb.group({
        LAN_TIPO: [TipoLancamento.Despesa as number, [Validators.required]],
        LAN_TITULO: ['', [Validators.required, Validators.maxLength(200)]],
        LAN_VALOR: [null as number | string | null, [valorValido]],
        LAN_DATA: [parseDataIso(hojeIso()) as Date | null, [Validators.required]],
        LAN_CATEGORIA: [CategoriaLancamento.SemCategoria as number, [Validators.required]],
        LAN_OBSERVACOES: ['', [Validators.maxLength(2000)]],
    });

    get edicao(): boolean {
        return !!this.data.id;
    }

    get ocupado(): boolean {
        return this.salvando || this.excluindo;
    }

    ngOnInit(): void {
        this._ref.disableClose = false;
        if (this.edicao) {
            this.carregar();
        } else if (this.data.tipo) {
            this.form.patchValue({ LAN_TIPO: this.data.tipo });
        }
    }

    carregar(): void {
        this.carregando = true;
        this.erroCarga = '';
        this._service.Get(this.data.id!).subscribe({
            next: l => {
                this.form.reset({
                    LAN_TIPO: l.LAN_TIPO,
                    LAN_TITULO: l.LAN_TITULO,
                    LAN_VALOR: l.LAN_VALOR,
                    LAN_DATA: parseDataIso(l.LAN_DATA),
                    LAN_CATEGORIA: l.LAN_CATEGORIA,
                    LAN_OBSERVACOES: l.LAN_OBSERVACOES ?? '',
                });
                this.gerado = !!l.LAN_GASTO_FIXO_ID;
                this.carregando = false;
            },
            error: error => {
                this.carregando = false;
                this.erroCarga = mensagemErro(error, 'Não foi possível carregar o lançamento.');
            },
        });
    }

    salvar(): void {
        if (this.ocupado || this.carregando) {
            return;
        }
        const titulo = this.form.get('LAN_TITULO')!;
        titulo.setValue((titulo.value ?? '').trim());
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const model: Lancamento = {
            LAN_TIPO: v.LAN_TIPO!,
            LAN_TITULO: (v.LAN_TITULO ?? '').trim(),
            LAN_VALOR: lerValor(v.LAN_VALOR)!,
            LAN_DATA: formatarDataIso(v.LAN_DATA as Date),
            LAN_CATEGORIA: v.LAN_CATEGORIA!,
            LAN_OBSERVACOES: (v.LAN_OBSERVACOES ?? '').trim() || null,
        };

        this.erroApi = '';
        this.salvando = true;
        this._ref.disableClose = true;
        const chamada = this.edicao ? this._service.Update({ ...model, Id: this.data.id! }) : this._service.Add(model);
        chamada.subscribe({
            next: () => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                this._ref.close(true);
            },
            error: error => {
                this.salvando = false;
                this._ref.disableClose = false;
                this.erroApi = mensagemErro(error, 'Não foi possível salvar o lançamento.');
            },
        });
    }

    excluir(): void {
        if (!this.edicao || this.ocupado) {
            return;
        }
        this._confirmacao.open({
            title: 'Excluir lançamento',
            message: 'Excluir este lançamento? Se ele veio de um gasto fixo, não será criado de novo.',
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Excluir', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.erroApi = '';
            this.excluindo = true;
            this._ref.disableClose = true;
            this._service.Delete(this.data.id!).subscribe({
                next: () => {
                    this.excluindo = false;
                    this._service.NotificarAlteracao();
                    this._ref.close(true);
                },
                error: error => {
                    this.excluindo = false;
                    this._ref.disableClose = false;
                    this.erroApi = mensagemErro(error, 'Não foi possível excluir o lançamento.');
                },
            });
        });
    }

    cancelar(): void {
        this._ref.close(false);
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['matDatepickerParse']) { return 'Data inválida.'; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['valorMinimo']) { return 'Informe um valor maior que zero.'; }
        if (e['valorMaximo']) { return 'O valor máximo é R$ 99.999.999,99.'; }
        if (e['matDatepickerMin'] || e['matDatepickerMax']) { return 'Use uma data entre 2000 e 2100.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }
}

// Abre o modal (600 px, 95vw no celular), como o modal da pendência.
export const LANCAMENTO_DIALOG_CONFIG = { width: '600px', maxWidth: '95vw', autoFocus: 'first-tabbable' } as const;
