import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, catchError, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { PendenciaFiltro } from 'app/models/DTOs/filters/PendenciaFiltro';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { CATEGORIA_PENDENCIA_ROTULO } from 'app/models/enums/CategoriaPendencia';
import { PRIORIDADE_PENDENCIA, PRIORIDADE_PENDENCIA_COR, PRIORIDADE_PENDENCIA_ROTULO } from 'app/models/enums/PrioridadePendencia';
import { StatusPendencia } from 'app/models/enums/StatusPendencia';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { EventoService } from 'app/services/evento.service';
import { configPaginator } from 'app/utils/config-paginator';
import { formatarDataComDiaSemana } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import { formatarPrazo } from 'app/utils/pendencia';
import { PENDENCIA_DIALOG_CONFIG, PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado } from '../pendencia-dialog/pendencia-dialog.component';
import { PendenciaStatusChipComponent } from '../pendencia-status-chip/pendencia-status-chip.component';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_PADRAO = 'abertas';
const PRAZO_PADRAO = 'todos';

const STATUS_FILTRO = [
    { valor: 'abertas', rotulo: 'Abertas' },
    { valor: '1', rotulo: 'A fazer' },
    { valor: '2', rotulo: 'Em andamento' },
    { valor: '3', rotulo: 'Concluídas' },
    { valor: 'todas', rotulo: 'Todas' },
];
const PRAZO_FILTRO = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'vencidas', rotulo: 'Vencidas' },
    { valor: 'vencendo', rotulo: 'Vencendo (até 3 dias)' },
    { valor: 'vencidasOuVencendo', rotulo: 'Vencidas ou vencendo' },
];

// Tela Pendências: as pendências de todos os eventos não cancelados, paginadas no servidor (25). O estado dos filtros fica na
// query string (?status=&prioridade=&membroId=&prazo=); o status padrão (abertas) e o prazo padrão (todos) não vão para a URL.
@Component({
    standalone: true,
    selector: 'pendencia-index',
    templateUrl: './pendencia-index.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
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
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatPaginatorModule, MatProgressSpinnerModule, MatSelectModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective, CustomSearchSelectComponent, PendenciaStatusChipComponent,
    ],
})
export class PendenciaIndexComponent implements OnInit, OnDestroy {
    // ---- Estado vindo da query string ----
    status = STATUS_PADRAO;
    prioridade: number | null = null;
    membroId: string | null = null;
    prazo = PRAZO_PADRAO;

    // ---- Dados ----
    pendencias: EventoPendenciaItem[] = [];
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;
    erroCarga = false;

    // ---- Opções dos filtros ----
    membros: Opcao[] = [];
    private _membrosSel = new OpcoesSelect<Opcao>(m => m.Id, m => m.Nome);
    get membrosOpcoes() { return this._membrosSel.de(this.membros); }
    statusLista = STATUS_FILTRO;
    prazoLista = PRAZO_FILTRO;
    prioridadeLista = PRIORIDADE_PENDENCIA;

    // Rascunho do painel de filtros (só vale depois de "Aplicar").
    filtroAberto = false;
    fStatus = new FormControl<string>(STATUS_PADRAO, { nonNullable: true });
    fPrioridade = new FormControl<number | null>(null);
    fMembro = new FormControl<string | null>(null);
    fPrazo = new FormControl<string>(PRAZO_PADRAO, { nonNullable: true });

    categoriaRotulo = CATEGORIA_PENDENCIA_ROTULO;
    prioridadeRotulo = PRIORIDADE_PENDENCIA_ROTULO;
    prioridadeCor = PRIORIDADE_PENDENCIA_COR;
    concluida = StatusPendencia.Concluida;
    formatarPrazo = formatarPrazo;
    formatarDataComDiaSemana = formatarDataComDiaSemana;

    private _chave = '';
    private _carga$ = new Subject<void>();
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    get filtrosAtivos(): boolean {
        return this.status !== STATUS_PADRAO || this.prioridade !== null || !!this.membroId || this.prazo !== PRAZO_PADRAO;
    }

    get mensagemVazia(): string {
        return this.filtrosAtivos ? 'Nenhuma pendência com estes filtros.' : 'Nenhuma pendência aberta.';
    }

    ngOnInit(): void {
        this._title.setTitle('Pendências');
        this.membros = this._route.snapshot.data['data']?.membros ?? [];

        // Uma carga por vez: a requisição anterior é cancelada quando outra começa.
        this._carga$.pipe(
            tap(() => {
                this.loading = true;
                this._cdr.markForCheck();
            }),
            switchMap(() => this._service.ListarPendencias(this.page + 1, this.pageSize, this.filtroApi()).pipe(
                map(resp => ({ resp, erro: null as any })),
                catchError(erro => of({ resp: null as PaginatedResponse<EventoPendenciaItem> | null, erro })),
            )),
            takeUntil(this._destroy$),
        ).subscribe(r => {
            this.loading = false;
            this.erroCarga = !!r.erro;
            if (r.erro) {
                this.pendencias = [];
                this.totalCount = 0;
                this._snackBar.open(mensagemErro(r.erro, 'Não foi possível carregar as pendências.'), 'X', { duration: 6000 });
            } else {
                const resp = r.resp!;
                // A última página esvaziou (ex.: concluiu a única pendência dela): volta uma página.
                if ((resp.Data ?? []).length === 0 && resp.TotalCount > 0 && this.page > 0) {
                    this.page = Math.max(0, Math.ceil(resp.TotalCount / this.pageSize) - 1);
                    this._carga$.next();
                    return;
                }
                this.pendencias = resp.Data ?? [];
                this.totalCount = resp.TotalCount ?? 0;
            }
            this._cdr.markForCheck();
        });

        // A query string é a fonte do estado; mudou algum filtro = volta à página 1 e nova carga.
        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            this.lerQuery(q);
            const chave = [this.status, this.prioridade, this.membroId, this.prazo].join('|');
            if (chave !== this._chave) {
                this._chave = chave;
                this.page = 0;
                this._carga$.next();
            }
            this.restaurarFiltros();
            this._cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    // ---- Ações ----

    recarregar(): void {
        this._carga$.next();
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this._carga$.next();
    }

    // Clique na linha/cartão: abre o mesmo modal da ficha do evento.
    abrir(p: EventoPendenciaItem): void {
        const data: PendenciaDialogData = { eventoId: p.EVP_EVENTO_ID, eventoNome: p.EVE_NOME, eventoData: p.EVE_DATA, pendencia: p };
        this._dialog.open<PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado>(PendenciaDialogComponent, { ...PENDENCIA_DIALOG_CONFIG, data })
            .afterClosed().subscribe(r => {
                if (r) {
                    this._snackBar.open(r.acao === 'excluida' ? 'Pendência excluída.' : 'Pendência salva.', 'X', { duration: 3000 });
                    this.recarregar();
                }
            });
    }

    // Nome do evento: abre a ficha (Ctrl/Cmd+clique em nova guia) sem abrir o modal.
    abrirEvento(p: EventoPendenciaItem, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/assinante/eventos', p.EVP_EVENTO_ID], event);
    }

    // ---- Filtros (escrevem a query string) ----

    private navegar(params: Record<string, string | number | null>): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: params, queryParamsHandling: 'merge' });
    }

    aoEsc(): void {
        if (this.filtroAberto) {
            this.fecharFiltros();
        }
    }

    abrirFiltros(): void {
        if (!this.filtroAberto) {
            this.filtroAberto = true;
        }
    }

    fecharFiltros(): void {
        if (!this.filtroAberto) {
            return;
        }
        this.filtroAberto = false;
        this.restaurarFiltros();
    }

    aplicarFiltros(): void {
        this.filtroAberto = false;
        this.navegar({
            status: this.fStatus.value === STATUS_PADRAO ? null : this.fStatus.value,
            prioridade: this.fPrioridade.value ?? null,
            membroId: this.fMembro.value || null,
            prazo: this.fPrazo.value === PRAZO_PADRAO ? null : this.fPrazo.value,
        });
    }

    limparFiltros(): void {
        this.filtroAberto = false;
        this.navegar({ status: null, prioridade: null, membroId: null, prazo: null });
    }

    private restaurarFiltros(): void {
        this.fStatus.setValue(this.status);
        this.fPrioridade.setValue(this.prioridade);
        this.fMembro.setValue(this.membroId);
        this.fPrazo.setValue(this.prazo);
    }

    // ---- Internos ----

    private lerQuery(q: ParamMap): void {
        const status = q.get('status') ?? '';
        this.status = STATUS_FILTRO.some(s => s.valor === status) ? status : STATUS_PADRAO;

        const prioridade = Number(q.get('prioridade'));
        this.prioridade = Number.isInteger(prioridade) && prioridade >= 1 && prioridade <= 3 ? prioridade : null;

        this.membroId = GUID.test(q.get('membroId') ?? '') ? q.get('membroId') : null;

        const prazo = q.get('prazo') ?? '';
        this.prazo = PRAZO_FILTRO.some(p => p.valor === prazo) ? prazo : PRAZO_PADRAO;
    }

    private filtroApi(): PendenciaFiltro {
        return {
            status: this.status === STATUS_PADRAO ? null : this.status,
            prioridade: this.prioridade,
            membroId: this.membroId,
            prazo: this.prazo === PRAZO_PADRAO ? null : this.prazo,
        };
    }

    trackPendencia = (_: number, p: EventoPendenciaItem) => p.Id;
}
