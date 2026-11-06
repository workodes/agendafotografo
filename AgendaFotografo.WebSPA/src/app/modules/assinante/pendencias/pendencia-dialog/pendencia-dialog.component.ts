import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { filter } from 'rxjs';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { CATEGORIA_PENDENCIA, CategoriaPendencia } from 'app/models/enums/CategoriaPendencia';
import { PRIORIDADE_PENDENCIA, PrioridadePendencia } from 'app/models/enums/PrioridadePendencia';
import { STATUS_PENDENCIA, StatusPendencia } from 'app/models/enums/StatusPendencia';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { EventoService } from 'app/services/evento.service';
import { MembroService } from 'app/services/membro.service';
import { diaSemana, formatarData, formatarDataIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { OpcoesSelect } from 'app/utils/opcoes-select';

export interface PendenciaDialogData {
    // Evento da pendência (nova: o da ficha; edição: o do item).
    eventoId: string;
    eventoNome: string;
    // Data do evento "yyyy-MM-dd" (subtítulo com o dia da semana).
    eventoData: string;
    // Preenchido na edição.
    pendencia?: EventoPendenciaItem | null;
}

export interface PendenciaDialogResultado {
    acao: 'salva' | 'excluida';
    item?: EventoPendenciaItem;
}

// Modal único da pendência (criar, editar e excluir), usado na ficha do evento e na tela Pendências.
// Fecha devolvendo o que aconteceu (PendenciaDialogResultado) ou undefined se foi só cancelado.
@Component({
    standalone: true,
    selector: 'app-pendencia-dialog',
    templateUrl: './pendencia-dialog.component.html',
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatDatepickerModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule,
        MatProgressSpinnerModule, MatSelectModule, CustomSearchSelectComponent,
    ],
})
export class PendenciaDialogComponent implements OnInit {
    private _fb = inject(FormBuilder);
    private _dialogRef = inject(MatDialogRef<PendenciaDialogComponent, PendenciaDialogResultado>);
    private _service = inject(EventoService);
    private _membroService = inject(MembroService);
    private _confirmacao = inject(FuseConfirmationService);
    readonly data = inject<PendenciaDialogData>(MAT_DIALOG_DATA);

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
    // Erro da API mostrado no próprio modal (ex.: "Membro inativo.").
    erroApi = '';

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
        return !!this.data.pendencia?.Id;
    }

    get subtitulo(): string {
        const dia = diaSemana(this.data.eventoData);
        const diaCap = dia ? dia.charAt(0).toUpperCase() + dia.slice(1) : '';
        const quando = diaCap ? `${diaCap}, ${formatarData(this.data.eventoData)}` : '';
        return quando ? `${this.data.eventoNome} · ${quando}` : this.data.eventoNome;
    }

    ngOnInit(): void {
        const p = this.data.pendencia;
        if (p) {
            this.form.reset({
                EVP_TITULO: p.EVP_TITULO,
                EVP_CATEGORIA: p.EVP_CATEGORIA,
                EVP_PRIORIDADE: p.EVP_PRIORIDADE,
                EVP_STATUS: p.EVP_STATUS,
                EVP_PRAZO: parseDataIso(p.EVP_PRAZO),
                EVP_MEMBRO_ID: p.EVP_MEMBRO_ID ?? null,
                EVP_OBSERVACOES: p.EVP_OBSERVACOES ?? '',
            });
        }

        // Membros ativos; o responsável já gravado entra mesmo inativo (marcado com "(inativo)").
        const gravado = p?.EVP_MEMBRO_ID ?? null;
        this._membroService.Opcoes(true, gravado).subscribe({
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

    limparPrazo(event: Event): void {
        event.stopPropagation();
        this.form.get('EVP_PRAZO')!.setValue(null);
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
                this._dialogRef.close({ acao: 'salva', item } as PendenciaDialogResultado);
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
                    this._dialogRef.close({ acao: 'excluida' } as PendenciaDialogResultado);
                },
                error: error => {
                    this.excluindo = false;
                    this.erroApi = mensagemErro(error, 'Não foi possível excluir a pendência.');
                },
            });
        });
    }

    cancelar(): void {
        this._dialogRef.close();
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

// Abre o modal da pendência (560 px, 95vw no celular). Usado pela ficha do evento e pela tela Pendências.
export const PENDENCIA_DIALOG_CONFIG = { width: '560px', maxWidth: '95vw', autoFocus: 'first-tabbable' } as const;
