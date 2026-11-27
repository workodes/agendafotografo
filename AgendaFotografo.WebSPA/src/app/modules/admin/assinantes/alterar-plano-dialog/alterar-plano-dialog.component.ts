import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { Assinante } from 'app/models/entities/Assinante';
import { TipoAssinante } from 'app/models/enums/TipoAssinante';
import { AssinanteService } from 'app/services/assinante.service';
import { PlanoService } from 'app/services/plano.service';
import { mensagemErro } from 'app/utils/mensagem-erro';

/** O que o diálogo precisa do assinante (serve para a linha da lista e para a ficha). */
export interface AlterarPlanoDialogData {
    Id: string;
    ASS_NOME: string;
    ASS_TIPO?: number;
    ASS_PLANO_ID?: string | null;
    PlanoNome?: string | null;
    ASS_CPF_CNPJ?: string | null;
}

// "Alterar plano" do assinante (Admin, plano 24): liga "Gratuito: só vê a agenda" ou escolhe o plano (Plano/Opcoes só com os
// ativos, mais o plano atual mesmo inativo). Os avisos mudam conforme a troca; o próprio diálogo é a confirmação.
// Fecha devolvendo o assinante atualizado (AssinanteModel) quando salvou.
@Component({
    standalone: true,
    selector: 'app-alterar-plano-dialog',
    templateUrl: './alterar-plano-dialog.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule, MatSlideToggleModule,
    ],
})
export class AlterarPlanoDialogComponent implements OnInit {
    private _ref = inject(MatDialogRef<AlterarPlanoDialogComponent, Assinante>);
    private _service = inject(AssinanteService);
    private _planoService = inject(PlanoService);
    private _snackBar = inject(MatSnackBar);
    readonly data = inject<AlterarPlanoDialogData>(MAT_DIALOG_DATA);

    readonly eraGratuito = this.data.ASS_TIPO === TipoAssinante.Fotografo;
    gratuito = new FormControl<boolean>(this.eraGratuito, { nonNullable: true });
    plano = new FormControl<string | null>(this.eraGratuito ? null : (this.data.ASS_PLANO_ID ?? null));

    planos: Opcao[] = [];
    carregando = false;
    erroCarga = '';
    salvando = false;
    // Erro da API (400 em texto) mostrado no próprio diálogo.
    erroApi = '';

    ngOnInit(): void {
        this.gratuito.valueChanges.subscribe(g => {
            this.erroApi = '';
            if (g) {
                this.plano.disable({ emitEvent: false });
            } else {
                this.plano.enable({ emitEvent: false });
            }
        });
        if (this.eraGratuito) {
            this.plano.disable({ emitEvent: false });
        }
        this.plano.valueChanges.subscribe(() => (this.erroApi = ''));
        this.carregar();
    }

    carregar(): void {
        this.carregando = true;
        this.erroCarga = '';
        this._planoService.Opcoes(true, this.data.ASS_PLANO_ID).subscribe({
            next: lista => {
                this.planos = lista ?? [];
                this.carregando = false;
            },
            error: error => {
                this.carregando = false;
                this.erroCarga = mensagemErro(error, 'Não foi possível carregar os planos.');
            },
        });
    }

    /** Troca entre Gratuito e plano (muda a role: a pessoa sai do sistema). */
    get trocaDeTipo(): boolean {
        return this.gratuito.value !== this.eraGratuito;
    }

    /** Conta com plano passando para Gratuito. */
    get paraGratuito(): boolean {
        return !this.eraGratuito && this.gratuito.value;
    }

    /** Continua com plano, só trocou qual. */
    get soTrocaDePlano(): boolean {
        return !this.eraGratuito && !this.gratuito.value && !!this.plano.value && this.plano.value !== (this.data.ASS_PLANO_ID ?? null);
    }

    /** O Gratuito exige o CPF/CNPJ gravado (a API confere de novo). */
    get faltaDocumento(): boolean {
        return this.paraGratuito && !(this.data.ASS_CPF_CNPJ ?? '').trim();
    }

    get mudou(): boolean {
        return this.trocaDeTipo || this.soTrocaDePlano;
    }

    get podeSalvar(): boolean {
        if (this.salvando || this.carregando || !!this.erroCarga || !this.mudou || this.faltaDocumento) {
            return false;
        }
        return this.gratuito.value || !!this.plano.value;
    }

    /** Situação atual, em texto. */
    get situacaoAtual(): string {
        return this.eraGratuito ? 'Gratuito (só vê a agenda)' : (this.data.PlanoNome || 'Sem plano');
    }

    salvar(): void {
        if (!this.podeSalvar) {
            return;
        }
        this.erroApi = '';
        this.salvando = true;
        this._ref.disableClose = true;
        this._service.AlterarPlano({
            Id: this.data.Id,
            Gratuito: this.gratuito.value,
            ASS_PLANO_ID: this.gratuito.value ? null : this.plano.value,
        }).subscribe({
            next: atualizado => {
                this.salvando = false;
                this._service.NotificarAlteracao();
                this._snackBar.open('Plano alterado.', 'X', { duration: 4000 });
                this._ref.close(atualizado);
            },
            error: error => {
                this.salvando = false;
                this._ref.disableClose = false;
                this.erroApi = mensagemErro(error, 'Não foi possível alterar o plano.');
            },
        });
    }

    cancelar(): void {
        this._ref.close();
    }
}

// 600 px (95vw no celular), do mesmo tamanho dos modais do Financeiro.
export const ALTERAR_PLANO_DIALOG_CONFIG = { width: '600px', maxWidth: '95vw', autoFocus: 'first-tabbable' } as const;
