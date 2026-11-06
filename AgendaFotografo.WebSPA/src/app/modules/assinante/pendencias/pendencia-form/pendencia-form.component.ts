import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Subscription, filter } from 'rxjs';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { CATEGORIA_PENDENCIA, CategoriaPendencia } from 'app/models/enums/CategoriaPendencia';
import { PRIORIDADE_PENDENCIA, PrioridadePendencia } from 'app/models/enums/PrioridadePendencia';
import { STATUS_PENDENCIA, StatusPendencia } from 'app/models/enums/StatusPendencia';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { EventoService } from 'app/services/evento.service';
import { MembroService } from 'app/services/membro.service';
import { formatarDataIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import type { PendenciaDialogData, PendenciaDialogResultado } from '../pendencia-dialog/pendencia-dialog.component';

let _proximoId = 0;

/**
 * Formulário único da pendência (criar, editar e excluir), usado pelo modal (`pendencia-dialog`) e pelo painel de detalhe da tela Pendências.
 * Não desenha botões: quem hospeda chama `salvar()`, `excluir()` e `cancelar()` por referência de template (`#f`) e lê `salvando`, `excluindo`, `edicao` e `sujo`.
 * Quando `data` muda (outra pendência), reinicia o formulário e recarrega as opções de responsável.
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-form',
    templateUrl: './pendencia-form.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, CustomSearchSelectComponent,
    ],
})
export class PendenciaFormComponent implements OnChanges, OnDestroy {
    private _fb = inject(FormBuilder);
    private _service = inject(EventoService);
    private _membroService = inject(MembroService);
    private _confirmacao = inject(FuseConfirmationService);

    @Input({ required: true }) data!: PendenciaDialogData;
    @Output() concluido = new EventEmitter<PendenciaDialogResultado>();
    @Output() cancelado = new EventEmitter<void>();

    // O id do <form> é único (modal e painel podem existir ao mesmo tempo).
    readonly formId = `form-pendencia-${++_proximoId}`;

    categorias = CATEGORIA_PENDENCIA;
    prioridades = PRIORIDADE_PENDENCIA;
    statusLista = STATUS_PENDENCIA;

    readonly prazoMin = new Date(2000, 0, 1);
    readonly prazoMax = new Date(2100, 11, 31);

    membros: Opcao[] = [];
    private _membrosSel = new OpcoesSelect<Opcao>(m => m.Id, m => m.Nome);
    get membrosOpcoes() { return this._membrosSel.de(this.membros); }

    carregandoMembros = true;
    salvando = false;
    excluindo = false;
    // Erro da API mostrado junto do formulário (ex.: "Membro inativo.").
    erroApi = '';

    private _subMembros?: Subscription;

    form = this._fb.group({
        EVP_TITULO: ['', [Validators.required, Validators.maxLength(200)]],
        EVP_CATEGORIA: [CategoriaPendencia.Outros as number, [Validators.required]],
        EVP_PRIORIDADE: [PrioridadePendencia.Media as number, [Validators.required]],
        EVP_STATUS: [StatusPendencia.AFazer as number, [Validators.required]],
        EVP_PRAZO: [null as Date | null],
        EVP_MEMBRO_ID: [null as string | null],
        EVP_OBSERVACOES: ['', [Validators.maxLength(2000)]],
    });

    get edicao(): boolean {
        return !!this.data?.pendencia?.Id;
    }

    /** Há edição não salva. */
    get sujo(): boolean {
        return this.form.dirty;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!changes['data']) {
            return;
        }
        const p = this.data.pendencia;
        this.erroApi = '';
        this.salvando = false;
        this.excluindo = false;
        this.form.reset({
            EVP_TITULO: p?.EVP_TITULO ?? '',
            EVP_CATEGORIA: p?.EVP_CATEGORIA ?? CategoriaPendencia.Outros,
            EVP_PRIORIDADE: p?.EVP_PRIORIDADE ?? PrioridadePendencia.Media,
            EVP_STATUS: p?.EVP_STATUS ?? StatusPendencia.AFazer,
            EVP_PRAZO: parseDataIso(p?.EVP_PRAZO),
            EVP_MEMBRO_ID: p?.EVP_MEMBRO_ID ?? null,
            EVP_OBSERVACOES: p?.EVP_OBSERVACOES ?? '',
        });

        // Membros ativos; o responsável já gravado entra mesmo inativo (marcado com "(inativo)").
        const gravado = p?.EVP_MEMBRO_ID ?? null;
        this.carregandoMembros = true;
        this._subMembros?.unsubscribe();
        this._subMembros = this._membroService.Opcoes(true, gravado).subscribe({
            next: opcoes => {
                this.membros = (opcoes ?? []).map(o =>
                    o.Id === gravado && p?.MEM_ATIVO === false ? { ...o, Nome: `${o.Nome} (inativo)` } : o);
                this.carregandoMembros = false;
            },
            error: error => {
                this.carregandoMembros = false;
                this.erroApi = mensagemErro(error, 'Não foi possível carregar os membros.');
            },
        });
    }

    ngOnDestroy(): void {
        this._subMembros?.unsubscribe();
    }

    limparPrazo(event: Event): void {
        event.stopPropagation();
        this.form.get('EVP_PRAZO')!.setValue(null);
        this.form.get('EVP_PRAZO')!.markAsDirty();
    }

    salvar(): void {
        if (this.salvando || this.excluindo) {
            return;
        }
        // Título aparado antes de validar.
        const titulo = this.form.get('EVP_TITULO')!;
        titulo.setValue((titulo.value ?? '').trim());
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const v = this.form.getRawValue();
        const model = {
            EVP_EVENTO_ID: this.data.eventoId,
            EVP_TITULO: (v.EVP_TITULO ?? '').trim(),
            EVP_CATEGORIA: v.EVP_CATEGORIA!,
            EVP_PRIORIDADE: v.EVP_PRIORIDADE!,
            EVP_STATUS: v.EVP_STATUS!,
            EVP_MEMBRO_ID: v.EVP_MEMBRO_ID || null,
            EVP_PRAZO: v.EVP_PRAZO instanceof Date && !isNaN(v.EVP_PRAZO.getTime()) ? formatarDataIso(v.EVP_PRAZO) : null,
            EVP_OBSERVACOES: (v.EVP_OBSERVACOES ?? '').trim() || null,
        };

        this.erroApi = '';
        this.salvando = true;
        const chamada = this.edicao
            ? this._service.AtualizarPendencia({ ...model, Id: this.data.pendencia!.Id })
            : this._service.AdicionarPendencia(model);
        chamada.subscribe({
            next: item => {
                this.salvando = false;
                this.form.markAsPristine();
                this.concluido.emit({ acao: 'salva', item });
            },
            error: error => {
                this.salvando = false;
                this.erroApi = mensagemErro(error, 'Não foi possível salvar a pendência.');
            },
        });
    }

    excluir(): void {
        const id = this.data.pendencia?.Id;
        if (!id || this.salvando || this.excluindo) {
            return;
        }
        this._confirmacao.open({
            title: 'Excluir pendência',
            message: `Excluir a pendência "${this.data.pendencia!.EVP_TITULO}"? Não dá para desfazer.`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Excluir', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.erroApi = '';
            this.excluindo = true;
            this._service.ExcluirPendencia(id).subscribe({
                next: () => {
                    this.excluindo = false;
                    this.form.markAsPristine();
                    this.concluido.emit({ acao: 'excluida' });
                },
                error: error => {
                    this.excluindo = false;
                    this.erroApi = mensagemErro(error, 'Não foi possível excluir a pendência.');
                },
            });
        });
    }

    cancelar(): void {
        this.cancelado.emit();
    }

    erro(nome: string): string {
        const e = this.form.get(nome)?.errors;
        if (!e) { return ''; }
        if (e['matDatepickerParse']) { return 'Data inválida.'; }
        if (e['required']) { return 'Campo obrigatório.'; }
        if (e['matDatepickerMin'] || e['matDatepickerMax']) { return 'Use uma data entre 2000 e 2100.'; }
        if (e['maxlength']) { return `Máximo de ${e['maxlength'].requiredLength} caracteres.`; }
        return 'Valor inválido.';
    }
}
