import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { filter, Subscription } from 'rxjs';
import { GastoFixoListItem } from 'app/models/DTOs/responses/GastoFixoListItem';
import { GastoFixoResumo } from 'app/models/DTOs/responses/GastoFixoResumo';
import { CATEGORIA_LANCAMENTO_ROTULO } from 'app/models/enums/CategoriaLancamento';
import { GastoFixoService } from 'app/services/gasto-fixo.service';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { LancamentoService } from 'app/services/lancamento.service';
import { configPaginator } from 'app/utils/config-paginator';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { formatarMoeda } from 'app/utils/moeda';
import { GASTO_FIXO_DIALOG_CONFIG, GastoFixoDialogComponent } from '../gasto-fixo-dialog/gasto-fixo-dialog.component';

type Estado = 'carregando' | 'pronto' | 'erro';

// Painel lateral "Gastos fixos" da tela Lançamentos (plano 22): gastos que viram lançamentos de Despesa uma vez por mês.
// Ações por linha: Editar, Pausar/Retomar e Excluir. Não usa o período do cabeçalho. Ao fechar o painel, se algum fixo
// mudou enquanto ele estava aberto, gera os lançamentos do mês (idempotente) e avisa a lista de Lançamentos.
@Component({
    selector: 'app-fixos-painel',
    standalone: true,
    templateUrl: './fixos-painel.component.html',
    styleUrl: './fixos-painel.component.scss',
    host: { class: 'block w-full min-w-0' },
    providers: [
        {
            provide: MatPaginatorIntl,
            useFactory: () => {
                const intl = new MatPaginatorIntl();
                configPaginator(intl);
                return intl;
            },
        },
    ],
    imports: [CommonModule, FecharComEscDirective, MatButtonModule, MatIconModule, MatMenuModule, MatPaginatorModule, MatProgressSpinnerModule, MatSidenavModule],
})
export class FixosPainelComponent implements OnInit {
    @ViewChild('drawer') private _drawer!: MatDrawer;

    private _service = inject(GastoFixoService);
    private _lancamentos = inject(LancamentoService);
    private _dialog = inject(MatDialog);
    private _snackBar = inject(MatSnackBar);
    private _confirmacao = inject(FuseConfirmationService);
    private _cdr = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);

    readonly categoriaRotulo = CATEGORIA_LANCAMENTO_ROTULO;
    readonly formatarMoeda = formatarMoeda;
    readonly esqueleto = [1, 2, 3];

    estadoLista: Estado = 'carregando';
    estadoResumo: Estado = 'carregando';
    erroLista = '';
    itens: GastoFixoListItem[] = [];
    resumo: GastoFixoResumo | null = null;
    page = 0;
    pageSize = 25;
    totalCount = 0;
    // Id do fixo com ação em andamento (pausar/retomar/excluir), para travar os botões da linha.
    ocupadoId: string | null = null;

    // Algum fixo foi criado, editado, pausado/retomado ou excluído enquanto o painel esteve aberto.
    private _alterou = false;

    private _subLista?: Subscription;
    private _subResumo?: Subscription;

    ngOnInit(): void {
        this._service.alterado$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this._alterou = true;
            if (this._drawer?.opened) {
                this.carregar();
            }
        });
        this._destroyRef.onDestroy(() => {
            this._subLista?.unsubscribe();
            this._subResumo?.unsubscribe();
        });
    }

    // Abre o painel e lê a lista na hora (a lista de Lançamentos não é recarregada).
    abrir(): void {
        this._alterou = false;
        this.carregar();
        this._drawer.open();
    }

    fechar(): void {
        this._drawer.close();
    }

    aoEsc(): void {
        if (this._drawer?.opened) {
            this.fechar();
        }
    }

    // Roda em qualquer forma de fechar (botão, ESC, fundo). Só gera se algo mudou.
    aoFechar(): void {
        if (!this._alterou) {
            return;
        }
        this._alterou = false;
        this._service.GerarLancamentos().subscribe({
            next: resp => {
                const gerados = resp?.Gerados ?? 0;
                if (gerados > 0) {
                    this._snackBar.open(`${gerados} ${gerados === 1 ? 'lançamento' : 'lançamentos'} de gastos fixos ${gerados === 1 ? 'adicionado' : 'adicionados'}.`, 'X', { duration: 6000 });
                    this._lancamentos.NotificarAlteracao();
                }
            },
            error: () => this._snackBar.open('Não foi possível atualizar os gastos fixos.', 'X', { duration: 6000 }),
        });
    }

    carregar(): void {
        this.carregarLista();
        this.carregarResumo();
    }

    carregarLista(): void {
        this.estadoLista = 'carregando';
        this._cdr.markForCheck();
        this._subLista?.unsubscribe();
        this._subLista = this._service.GetAllPaginated(this.page + 1, this.pageSize).subscribe({
            next: resp => {
                this.itens = resp.Data ?? [];
                this.totalCount = resp.TotalCount ?? 0;
                this.page = Math.max((resp.Page ?? 1) - 1, 0);
                this.pageSize = resp.PageSize ?? this.pageSize;
                this.estadoLista = 'pronto';
                this._cdr.markForCheck();
            },
            error: error => {
                this.erroLista = mensagemErro(error, 'Não foi possível carregar os gastos fixos.');
                this.estadoLista = 'erro';
                this._cdr.markForCheck();
            },
        });
    }

    carregarResumo(): void {
        this.estadoResumo = 'carregando';
        this._cdr.markForCheck();
        this._subResumo?.unsubscribe();
        this._subResumo = this._service.Resumo().subscribe({
            next: resp => {
                this.resumo = resp;
                this.estadoResumo = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                this.estadoResumo = 'erro';
                this._cdr.markForCheck();
            },
        });
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregarLista();
    }

    textoContagem(r: GastoFixoResumo): string {
        const ativos = `${r.Ativos} ${r.Ativos === 1 ? 'ativo' : 'ativos'}`;
        const pausados = `${r.Pausados} ${r.Pausados === 1 ? 'pausado' : 'pausados'}`;
        return `${ativos}, ${pausados}`;
    }

    novo(): void {
        // O modal avisa "Gasto fixo salvo."; a despesa do mês é gerada ao fechar o painel.
        this._dialog.open(GastoFixoDialogComponent, { ...GASTO_FIXO_DIALOG_CONFIG, data: {} });
    }

    editar(g: GastoFixoListItem): void {
        this._dialog.open(GastoFixoDialogComponent, { ...GASTO_FIXO_DIALOG_CONFIG, data: { id: g.Id } });
    }

    alternarAtivo(g: GastoFixoListItem): void {
        if (this.ocupadoId) {
            return;
        }
        this.ocupadoId = g.Id;
        const chamada = g.GAF_ATIVO ? this._service.Inativar(g.Id) : this._service.Ativar(g.Id);
        chamada.subscribe({
            next: () => {
                this.ocupadoId = null;
                this._snackBar.open(g.GAF_ATIVO ? 'Gasto fixo pausado.' : 'Gasto fixo retomado.', 'X', { duration: 4000 });
                this._service.NotificarAlteracao();
            },
            error: error => {
                this.ocupadoId = null;
                this._snackBar.open(mensagemErro(error, g.GAF_ATIVO ? 'Não foi possível pausar o gasto fixo.' : 'Não foi possível retomar o gasto fixo.'), 'X', { duration: 6000 });
                this._cdr.markForCheck();
            },
        });
    }

    excluir(g: GastoFixoListItem): void {
        if (this.ocupadoId) {
            return;
        }
        this._confirmacao.open({
            title: 'Excluir gasto fixo',
            message: `Excluir o gasto fixo "${g.GAF_TITULO}"? Os lançamentos já criados por ele continuam na sua carteira.`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Excluir', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.ocupadoId = g.Id;
            this._service.Delete(g.Id).subscribe({
                next: () => {
                    this.ocupadoId = null;
                    this._snackBar.open('Gasto fixo excluído.', 'X', { duration: 4000 });
                    this._service.NotificarAlteracao();
                },
                error: error => {
                    this.ocupadoId = null;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível excluir o gasto fixo.'), 'X', { duration: 6000 });
                    this._cdr.markForCheck();
                },
            });
        });
    }

    trackItem(_: number, g: GastoFixoListItem): string {
        return g.Id;
    }
}
