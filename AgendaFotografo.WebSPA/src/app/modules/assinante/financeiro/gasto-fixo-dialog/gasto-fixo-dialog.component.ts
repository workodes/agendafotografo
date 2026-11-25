import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { CATEGORIA_LANCAMENTO, CategoriaLancamento } from 'app/models/enums/CategoriaLancamento';
import { GastoFixo } from 'app/models/entities/GastoFixo';
import { GastoFixoService } from 'app/services/gasto-fixo.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { lerValor } from 'app/utils/moeda';
import { valorValido } from 'app/utils/valor-validator';

export interface GastoFixoDialogData {
    // Preenchido na edição (carrega por Obter).
    id?: string | null;
}

// Modal do gasto fixo (criar e editar), aberto só pelo painel "Gastos fixos". Fecha devolvendo true quando salvou. Avisa o
// GastoFixoService (alterado$); a despesa do mês é gerada pelo painel ao fechar.
@Component({
    standalone: true,
    selector: 'app-gasto-fixo-dialog',
    templateUrl: './gasto-fixo-dialog.component.html',
    providers: [provideNgxMask()],
    imports: [
        CommonModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class GastoFixoDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _ref = inject(MatDialogRef<GastoFixoDialogComponent, boolean>);
    private _service = inject(GastoFixoService);
    private _snackBar = inject(MatSnackBar);
    readonly data = inject<GastoFixoDialogData>(MAT_DIALOG_DATA);

    readonly categorias = CATEGORIA_LANCAMENTO;

    carregando = false;
    erroCarga = '';
    salvando = false;
    // Erro da API (400 em texto) mostrado no próprio modal.
    erroApi = '';

    form = this._fb.group({
        GAF_TITULO: ['', [Validators.required, Validators.maxLength(200)]],
        GAF_VALOR: [null as number | string | null, [valorValido]],
        GAF_CATEGORIA: [CategoriaLancamento.SemCategoria as number, [Validators.required]],
        GAF_DIA: [null as number | null, [Validators.required, Validators.min(1), Validators.max(31), Validators.pattern(/^\d+$/)]],
    });

    get edicao(): boolean {
        return !!this.data.id;
    }

    ngOnInit(): void {
        if (this.edicao) {
            this.carregar();
        }
    }

    carregar(): void {
        this.carregando = true;
        this.erroCarga = '';
        this._service.Get(this.data.id!).subscribe({
            next: g => {
                this.form.reset({ GAF_TITULO: g.GAF_TITULO, GAF_VALOR: g.GAF_VALOR, GAF_CATEGORIA: g.GAF_CATEGORIA, GAF_DIA: g.GAF_DIA });
                this.carregando = false;
            },
            error: error => {
                this.carregando = false;
                this.erroCarga = mensagemErro(error, 'Não foi possível carregar o gasto fixo.');
            },
        });
    }

    salvar(): void {
        if (this.salvando || this.carregando) {
            return;
        }
        const titulo = this.form.get('GAF_TITULO')!;
        titulo.setValue((titulo.value ?? '').trim());
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const model: GastoFixo = {
            GAF_TITULO: (v.GAF_TITULO ?? '').trim(),
            GAF_VALOR: lerValor(v.GAF_VALOR)!,
            GAF_CATEGORIA: v.GAF_CATEGORIA!,
            GAF_DIA: Number(v.GAF_DIA),
        };

        this.erroApi = '';
        this.salvando = true;
        this._ref.disableClose = true;
        const chamada = this.edicao ? this._service.Update({ ...model, Id: this.data.id! }) : this._service.Add(model);
        chamada.subscribe({
            next: () => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                this._snackBar.open('Gasto fixo salvo.', 'X', { duration: 4000 });
                this._ref.close(true);
            },
            error: error => {
                this.salvando = false;
                this._ref.disableClose = false;
                this.erroApi = mensagemErro(error, 'Não foi possível salvar o gasto fixo.');
            },
        });
    }

    cancelar(): void {
        this._ref.close(false);
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['valorMinimo']) { return 'Informe um valor maior que zero.'; }
        if (e['valorMaximo']) { return 'O valor máximo é R$ 99.999.999,99.'; }
        if (e['min'] || e['max'] || e['pattern']) { return 'Informe um dia de 1 a 31.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }
}

// Abre o modal do gasto fixo (600 px, 95vw no celular), do mesmo tamanho do modal do lançamento.
export const GASTO_FIXO_DIALOG_CONFIG = { width: '600px', maxWidth: '95vw', autoFocus: 'first-tabbable' } as const;
