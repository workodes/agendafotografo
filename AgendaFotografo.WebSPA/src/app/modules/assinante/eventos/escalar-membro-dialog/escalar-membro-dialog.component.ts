import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { EventoMembroItem, OpcaoEscalaItem } from 'app/models/DTOs/responses/EventoMembroItem';
import { Membro } from 'app/models/entities/Membro';
import { FUNCAO_MEMBRO, FUNCAO_MEMBRO_ROTULO, FuncaoMembro } from 'app/models/enums/FuncaoMembro';
import { EventoService } from 'app/services/evento.service';
import { MembroService } from 'app/services/membro.service';
import { textoOutrosEventos } from 'app/utils/escala';
import { instagramValido, limparInstagram, somenteDigitos } from 'app/utils/instagram';
import { mensagemErro } from 'app/utils/mensagem-erro';

export interface EscalarMembroDialogData {
    eventoId: string;
    // Data do evento "yyyy-MM-dd" (link para a Visão do dia no alerta de conflito).
    dataEvento: string;
}

// Modal "Escalar membro": escolhe um membro ativo ainda fora da escala (com alerta de conflito, que não bloqueia) ou cadastra
// um fotógrafo novo na hora ("+ Novo fotógrafo": api/Membro/Criar e depois AdicionarMembro). Fecha devolvendo o EventoMembroItem escalado.
@Component({
    standalone: true,
    selector: 'app-escalar-membro-dialog',
    templateUrl: './escalar-membro-dialog.component.html',
    providers: [provideNgxMask()],
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class EscalarMembroDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _dialogRef = inject(MatDialogRef<EscalarMembroDialogComponent, EventoMembroItem>);
    private _eventoService = inject(EventoService);
    private _membroService = inject(MembroService);
    readonly data = inject<EscalarMembroDialogData>(MAT_DIALOG_DATA);

    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;
    funcoes = FUNCAO_MEMBRO;
    textoOutrosEventos = textoOutrosEventos;

    carregando = true;
    falhaCarga = '';
    opcoes: OpcaoEscalaItem[] = [];
    novoMembro = false;
    salvando = false;
    // Erro da API mostrado no próprio formulário (ex.: @instagram ou telefone repetido).
    erroApi = '';
    // Se o cadastro rápido deu certo mas o AdicionarMembro falhou, o retry só escala (não cadastra de novo).
    private _membroCriadoId: string | null = null;

    formExistente = this._fb.group({
        membroId: [null as string | null, [Validators.required]],
        posicao: ['', [Validators.maxLength(150)]],
    });

    formNovo = this._fb.group({
        MEM_NOME: ['', [Validators.required, Validators.maxLength(200)]],
        MEM_INSTAGRAM: ['', [instagramValido]],
        MEM_TELEFONE: [''],
        MEM_FUNCAO: [FuncaoMembro.Fotografo as number, [Validators.required]],
        posicao: ['', [Validators.maxLength(150)]],
    });

    // Cadastro rápido já feito (falta só escalar): trava a troca de modo.
    get membroCriado(): boolean {
        return !!this._membroCriadoId;
    }

    get selecionada(): OpcaoEscalaItem | undefined {
        return this.opcoes.find(o => o.Id === this.formExistente.value.membroId);
    }

    ngOnInit(): void {
        this._eventoService.OpcoesEscala(this.data.eventoId).subscribe({
            next: opcoes => {
                this.opcoes = opcoes ?? [];
                this.carregando = false;
                // Sem ninguém para escalar, vai direto para o cadastro rápido.
                if (this.opcoes.length === 0) {
                    this.novoMembro = true;
                }
            },
            error: error => {
                this.carregando = false;
                this.falhaCarga = mensagemErro(error, 'Não foi possível carregar os membros.');
            },
        });
    }

    alternarModo(): void {
        if (this.salvando || this._membroCriadoId) {
            return;
        }
        this.novoMembro = !this.novoMembro;
        this.erroApi = '';
    }

    escalar(): void {
        if (this.salvando) {
            return;
        }
        const form = this.novoMembro ? this.formNovo : this.formExistente;
        if (form.invalid) {
            form.markAllAsTouched();
            return;
        }
        this.erroApi = '';
        this.salvando = true;

        if (!this.novoMembro) {
            const v = this.formExistente.getRawValue();
            this.adicionar(v.membroId!, v.posicao);
            return;
        }

        if (this._membroCriadoId) {
            this.adicionar(this._membroCriadoId, this.formNovo.getRawValue().posicao);
            return;
        }

        // Cadastro rápido: só o essencial; o restante se completa depois na tela Equipe.
        const v = this.formNovo.getRawValue();
        const membro: Membro = {
            MEM_NOME: (v.MEM_NOME ?? '').trim(),
            MEM_FUNCAO: v.MEM_FUNCAO,
            MEM_INSTAGRAM: limparInstagram(v.MEM_INSTAGRAM) || null,
            MEM_TELEFONE: somenteDigitos(v.MEM_TELEFONE) || null,
            MEM_EMAIL: null,
            MEM_OBSERVACOES: null,
        };
        this._membroService.Add(membro).subscribe({
            next: criado => {
                this._membroCriadoId = criado.Id!;
                this._membroService.NotificarAlteracao();
                this.adicionar(criado.Id!, v.posicao);
            },
            error: error => {
                this.salvando = false;
                this.erroApi = mensagemErro(error, 'Não foi possível cadastrar o fotógrafo.');
            },
        });
    }

    cancelar(): void {
        this._dialogRef.close();
    }

    erroNovo(nome: string): string {
        const e = this.formNovo.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['instagram']) { return 'Use só letras, números, ponto e sublinhado.'; }
        if (e['mask']) { return 'Telefone incompleto (DDD + número).'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }

    private adicionar(membroId: string, posicao: string | null | undefined): void {
        this._eventoService.AdicionarMembro({
            EVM_EVENTO_ID: this.data.eventoId,
            EVM_MEMBRO_ID: membroId,
            EVM_POSICAO: (posicao ?? '').trim() || null,
        }).subscribe({
            next: item => {
                this.salvando = false;
                this._dialogRef.close(item);
            },
            error: error => {
                this.salvando = false;
                const msg = mensagemErro(error, 'Não foi possível escalar o membro.');
                this.erroApi = this._membroCriadoId ? `O fotógrafo foi cadastrado, mas não foi escalado: ${msg} Clique em "Escalar" para tentar de novo.` : msg;
            },
        });
    }
}
