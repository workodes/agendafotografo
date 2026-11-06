import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { concatMap, from, toArray, catchError, of, map } from 'rxjs';
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

// Modal "Escalar equipe": marca VÁRIOS membros ativos ainda fora da escala (busca por nome, alerta de conflito que não bloqueia) e
// escala todos de uma vez (um AdicionarMembro por membro, em sequência); a posição se ajusta depois, na lista da equipe da ficha.
// Ou cadastra um fotógrafo novo na hora ("+ Novo fotógrafo": api/Membro/Criar e depois AdicionarMembro).
// Fecha devolvendo a lista de EventoMembroItem escalados (também ao Cancelar, se parte já tinha sido escalada antes de uma falha).
@Component({
    standalone: true,
    selector: 'app-escalar-membro-dialog',
    templateUrl: './escalar-membro-dialog.component.html',
    providers: [provideNgxMask()],
    imports: [
        CommonModule, RouterModule, FormsModule, ReactiveFormsModule, NgxMaskDirective,
        MatButtonModule, MatCheckboxModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule,
    ],
})
export class EscalarMembroDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _dialogRef = inject(MatDialogRef<EscalarMembroDialogComponent, EventoMembroItem[]>);
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

    // Lista com marcação múltipla
    busca = '';
    marcados = new Set<string>();
    // Já escalados nesta abertura (sobrevivem a uma falha no meio do lote).
    private _escalados: EventoMembroItem[] = [];

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

    trackOpcao = (_: number, o: OpcaoEscalaItem) => o.Id;

    get filtradas(): OpcaoEscalaItem[] {
        const t = this.normalizar(this.busca);
        return t ? this.opcoes.filter(o => this.normalizar(`${o.MEM_NOME} ${o.MEM_INSTAGRAM ?? ''}`).includes(t)) : this.opcoes;
    }

    get comConflitoMarcados(): OpcaoEscalaItem[] {
        return this.opcoes.filter(o => this.marcados.has(o.Id) && o.OutrosEventos?.length);
    }

    alternar(o: OpcaoEscalaItem): void {
        if (this.salvando) {
            return;
        }
        if (this.marcados.has(o.Id)) {
            this.marcados.delete(o.Id);
        } else {
            this.marcados.add(o.Id);
        }
    }

    get todosFiltradosMarcados(): boolean {
        const f = this.filtradas;
        return f.length > 0 && f.every(o => this.marcados.has(o.Id));
    }

    alternarTodos(): void {
        const marcar = !this.todosFiltradosMarcados;
        for (const o of this.filtradas) {
            if (marcar) { this.marcados.add(o.Id); } else { this.marcados.delete(o.Id); }
        }
    }

    private normalizar(v: string): string {
        return (v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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
        if (!this.novoMembro) {
            this.escalarMarcados();
            return;
        }
        if (this.formNovo.invalid) {
            this.formNovo.markAllAsTouched();
            return;
        }
        this.erroApi = '';
        this.salvando = true;

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
        this._dialogRef.close(this._escalados.length ? this._escalados : undefined);
    }

    // Escala os marcados um a um (na ordem da lista). Se um falhar, para ali: os que já foram ficam escalados (saem da lista)
    // e o erro aparece no formulário; "Escalar" de novo tenta os que sobraram.
    private escalarMarcados(): void {
        const ids = this.opcoes.filter(o => this.marcados.has(o.Id)).map(o => o.Id);
        if (ids.length === 0) {
            this.erroApi = 'Marque pelo menos um membro.';
            return;
        }
        this.erroApi = '';
        this.salvando = true;
        let falha: { id: string; msg: string } | null = null;
        from(ids).pipe(
            concatMap(id => falha ? of(null) : this._eventoService.AdicionarMembro({ EVM_EVENTO_ID: this.data.eventoId, EVM_MEMBRO_ID: id, EVM_POSICAO: null }).pipe(
                catchError(error => { falha = { id, msg: mensagemErro(error, 'Não foi possível escalar o membro.') }; return of(null); }),
            )),
            map(item => { if (item) { this._escalados.push(item); this.marcados.delete(item.EVM_MEMBRO_ID); } return item; }),
            toArray(),
        ).subscribe(() => {
            this.salvando = false;
            const okIds = new Set(this._escalados.map(e => e.EVM_MEMBRO_ID));
            this.opcoes = this.opcoes.filter(o => !okIds.has(o.Id));
            if (!falha) {
                this._dialogRef.close(this._escalados);
                return;
            }
            const nome = this.opcoes.find(o => o.Id === falha!.id)?.MEM_NOME ?? 'um membro';
            this.erroApi = `Não foi possível escalar ${nome}: ${falha.msg}` + (this._escalados.length ? ` (${this._escalados.length} já escalado(s)).` : '');
        });
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
                this._dialogRef.close([...this._escalados, item]);
            },
            error: error => {
                this.salvando = false;
                const msg = mensagemErro(error, 'Não foi possível escalar o membro.');
                this.erroApi = this._membroCriadoId ? `O fotógrafo foi cadastrado, mas não foi escalado: ${msg} Clique em "Escalar" para tentar de novo.` : msg;
            },
        });
    }
}
