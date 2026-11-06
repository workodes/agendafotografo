import { PaginaCabecalhoComponent } from 'app/modules/shared/components/pagina-cabecalho/pagina-cabecalho.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Observable, Subject, catchError, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { PendenciaFiltro } from 'app/models/DTOs/filters/PendenciaFiltro';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { PendenciasContagem } from 'app/models/DTOs/responses/PendenciasContagem';
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
import { ChaveFiltroRapido, FILTROS_RAPIDOS, FiltroRapido, filtroRapidoAtual, formatarPrazo } from 'app/utils/pendencia';
import { PENDENCIA_DIALOG_CONFIG, PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado } from '../pendencia-dialog/pendencia-dialog.component';
import { PendenciaCheckComponent } from '../pendencia-check/pendencia-check.component';
import { PendenciaDetalheComponent } from '../pendencia-detalhe/pendencia-detalhe.component';
import { PendenciaLinhaComponent } from '../pendencia-linha/pendencia-linha.component';
import { PendenciaQuadroComponent } from '../pendencia-quadro/pendencia-quadro.component';
import { PendenciaSidebarComponent } from '../pendencia-sidebar/pendencia-sidebar.component';
import { PendenciaStatusChipComponent } from '../pendencia-status-chip/pendencia-status-chip.component';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_PADRAO = 'abertas';
const PRAZO_PADRAO = 'todos';
// Valores aceitos na URL (os antigos continuam válidos: nenhum link existente quebra).
const STATUS_VALIDOS = ['abertas', '1', '2', '3', '4', 'todas'];
const PRAZO_VALIDOS = ['todos', 'vencidas', 'vencendo', 'vencidasOuVencendo'];

type Visao = 'lista' | 'quadro';

// Tela Pendências no estilo mailbox do Fuse: painel lateral de filtros rápidos com contadores, lista e (a partir de `lg`) detalhe editável ao lado;
// abaixo de `lg` o clique abre o `pendencia-dialog`. Alterna entre Lista e Quadro (`?visao=quadro`). O estado dos filtros fica na query string
// (?visao=&status=&prioridade=&membroId=&prazo=); status padrão (abertas), prazo padrão (todos) e visão padrão (lista) não vão para a URL.
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
        MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule,
        MatSelectModule, MatSidenavModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective, CustomSearchSelectComponent, PendenciaStatusChipComponent, PaginaCabecalhoComponent,
        PendenciaCheckComponent, PendenciaSidebarComponent, PendenciaLinhaComponent, PendenciaDetalheComponent, PendenciaQuadroComponent,
    ],
})
export class PendenciaIndexComponent implements OnInit, OnDestroy {
    // ---- Estado vindo da query string ----
    visao: Visao = 'lista';
    status = STATUS_PADRAO;
    prioridade: number | null = null;
    membroId: string | null = null;
    prazo = PRAZO_PADRAO;

    // ---- Dados ----
    pendencias: EventoPendenciaItem[] = [];
    contagem: PendenciasContagem | null = null;
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;
    erroCarga = false;

    // ---- Layout ----
    ehMd = false;
    ehLg = false;
    // Lateral aberta como gaveta (só abaixo de `lg`).
    menuAberto = false;

    // ---- Painel de detalhe (a partir de `lg`; seleção só em memória) ----
    selecionada: EventoPendenciaItem | null = null;
    @ViewChild(PendenciaDetalheComponent) detalhe?: PendenciaDetalheComponent;

    // ---- Opções dos filtros ----
    membros: Opcao[] = [];
    private _membrosSel = new OpcoesSelect<Opcao>(m => m.Id, m => m.Nome);
    get membrosOpcoes() { return this._membrosSel.de(this.membros); }
    prioridadeLista = PRIORIDADE_PENDENCIA;

    // Rascunho do painel de filtros (só vale depois de "Aplicar").
    filtroAberto = false;
    fPrioridade = new FormControl<number | null>(null);
    fMembro = new FormControl<string | null>(null);

    categoriaRotulo = CATEGORIA_PENDENCIA_ROTULO;
    prioridadeRotulo = PRIORIDADE_PENDENCIA_ROTULO;
    prioridadeCor = PRIORIDADE_PENDENCIA_COR;
    concluida = StatusPendencia.Concluida;

    // Concluída e ignorada aparecem esmaecidas (só a concluída é riscada).
    esmaecida(p: { EVP_STATUS: number }): boolean {
        return p.EVP_STATUS === StatusPendencia.Concluida || p.EVP_STATUS === StatusPendencia.Ignorada;
    }
    formatarPrazo = formatarPrazo;
    formatarDataComDiaSemana = formatarDataComDiaSemana;

    private _chave = '';
    private _chaveContagem = '';
    private _eraLista = false;
    private _carga$ = new Subject<void>();
    private _contagem$ = new Subject<void>();
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _confirmacao: FuseConfirmationService,
        private _breakpoint: BreakpointObserver,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    /** Filtro rápido destacado (null = a combinação status + prazo da URL não é nenhum deles). */
    get rapido(): FiltroRapido | null {
        return filtroRapidoAtual(this.status, this.prazo);
    }

    get chaveRapida(): ChaveFiltroRapido | null {
        return this.rapido?.chave ?? null;
    }

    // O painel de filtros só tem Prioridade e Responsável; uma combinação antiga de status/prazo (sem filtro rápido) também o deixa ativo.
    get filtrosAtivos(): boolean {
        return this.prioridade !== null || !!this.membroId || this.rapido === null;
    }

    get nomeFiltro(): string {
        return this.rapido?.rotulo ?? 'Filtro personalizado';
    }

    get mensagemVazia(): string {
        return this.filtrosAtivos || this.rapido?.chave !== 'abertas' ? 'Nenhuma pendência com estes filtros.' : 'Nenhuma pendência aberta.';
    }

    // "1 - 25 de 120" (a barra da lista).
    get faixa(): string {
        if (this.totalCount === 0) {
            return '0';
        }
        const ini = this.page * this.pageSize + 1;
        const fim = Math.min(this.totalCount, (this.page + 1) * this.pageSize);
        return `${ini} - ${fim} de ${this.totalCount}`;
    }

    get sidebarAberta(): boolean {
        return this.visao === 'lista' && (this.ehLg || this.menuAberto);
    }

    ngOnInit(): void {
        this._title.setTitle('Pendências');
        this.membros = this._route.snapshot.data['data']?.membros ?? [];

        this.ehMd = this._breakpoint.isMatched('(min-width: 960px)');
        this.ehLg = this._breakpoint.isMatched('(min-width: 1280px)');
        this._breakpoint.observe(['(min-width: 960px)', '(min-width: 1280px)']).pipe(takeUntil(this._destroy$)).subscribe(r => {
            this.ehMd = r.breakpoints['(min-width: 960px)'];
            const lg = r.breakpoints['(min-width: 1280px)'];
            // Cruzar `lg` com o painel aberto só fecha o painel.
            if (lg !== this.ehLg) {
                this.selecionada = null;
                this.menuAberto = false;
            }
            this.ehLg = lg;
            this._cdr.markForCheck();
        });

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

        // Contadores: a requisição anterior é descartada; falha na contagem não derruba a lista (selos sem número).
        this._contagem$.pipe(
            switchMap(() => this._service.ContarPendencias({ prioridade: this.prioridade, membroId: this.membroId }).pipe(
                catchError(() => of(null as PendenciasContagem | null)),
            )),
            takeUntil(this._destroy$),
        ).subscribe(c => {
            this.contagem = c;
            this._cdr.markForCheck();
        });

        // Qualquer alteração de pendência (caixa, chip, painel, modal, Quadro) chama NotificarAlteracao(): atualiza o sino e, aqui,
        // os contadores e a lista. No Quadro, quem recarrega as colunas é o próprio quadro.
        this._service.alterado$.pipe(takeUntil(this._destroy$)).subscribe(() => {
            this._contagem$.next();
            if (this.visao === 'lista') {
                this._carga$.next();
            }
        });

        // A query string é a fonte do estado; mudou algum filtro = volta à página 1 e nova carga.
        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            this.lerQuery(q);
            const chave = [this.status, this.prioridade, this.membroId, this.prazo].join('|');
            // A lista só carrega na visão Lista; ao voltar do Quadro ela é relida.
            const lista = this.visao === 'lista';
            if (chave !== this._chave || (lista && !this._eraLista)) {
                if (chave !== this._chave) {
                    this.page = 0;
                }
                this._chave = chave;
                if (lista) {
                    this._carga$.next();
                }
            }
            this._eraLista = lista;
            const chaveContagem = [this.prioridade, this.membroId].join('|');
            if (chaveContagem !== this._chaveContagem) {
                this._chaveContagem = chaveContagem;
                this._contagem$.next();
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
        this._contagem$.next();
        this._carga$.next();
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this._carga$.next();
    }

    // Clique na linha/cartão: a partir de `lg` abre o painel de detalhe; abaixo disso, o modal da ficha do evento.
    abrir(p: EventoPendenciaItem): void {
        if (this.ehLg) {
            this.selecionar(p);
            return;
        }
        const data: PendenciaDialogData = { eventoId: p.EVP_EVENTO_ID, eventoNome: p.EVE_NOME, eventoData: p.EVE_DATA, pendencia: p };
        this._dialog.open<PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado>(PendenciaDialogComponent, { ...PENDENCIA_DIALOG_CONFIG, data })
            .afterClosed().subscribe(r => {
                if (r) {
                    this._service.NotificarAlteracao(); // atualiza o sino, os contadores e a lista
                    this._snackBar.open(r.acao === 'excluida' ? 'Pendência excluída.' : 'Pendência salva.', 'X', { duration: 3000 });
                }
            });
    }

    // Nome do evento: abre a ficha (Ctrl/Cmd+clique em nova guia) sem abrir o modal.
    abrirEvento(p: EventoPendenciaItem, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/assinante/eventos', p.EVP_EVENTO_ID], event);
    }

    // ---- Painel de detalhe ----

    selecionar(p: EventoPendenciaItem): void {
        if (this.selecionada?.Id === p.Id) {
            return;
        }
        this.confirmarDescarte().subscribe(ok => {
            if (ok) {
                this.selecionada = p;
                this._cdr.markForCheck();
            }
        });
    }

    fecharDetalhe(): void {
        this.confirmarDescarte().subscribe(ok => {
            if (ok) {
                this.selecionada = null;
                this._cdr.markForCheck();
            }
        });
    }

    // Salvou ou excluiu no painel: a lista e os contadores são recarregados pelo NotificarAlteracao().
    aoConcluirDetalhe(r: PendenciaDialogResultado): void {
        if (r.acao === 'excluida') {
            this.selecionada = null;
        } else if (r.item) {
            // O painel mostra o item devolvido pela API, mesmo que ele saia do filtro atual.
            this.selecionada = r.item;
        }
        this._service.NotificarAlteracao();
        this._snackBar.open(r.acao === 'excluida' ? 'Pendência excluída.' : 'Pendência salva.', 'X', { duration: 3000 });
    }

    // Caixa ou chip de uma linha mudou o status: se for a pendência aberta no painel (sem edição pendente), o painel mostra o item novo.
    aoAlterarItem(item: EventoPendenciaItem): void {
        if (this.selecionada?.Id === item.Id && !this.detalhe?.sujo) {
            this.selecionada = item;
        }
    }

    private confirmarDescarte(): Observable<boolean> {
        if (!this.selecionada || !this.detalhe?.sujo) {
            return of(true);
        }
        return this._confirmacao.open({
            title: 'Descartar alterações',
            message: 'Esta pendência tem alterações não salvas. Descartar?',
            icon: { show: true, name: 'heroicons_outline:exclamation-triangle', color: 'warn' },
            actions: { cancel: { label: 'Continuar editando' }, confirm: { label: 'Descartar', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(map(r => r === 'confirmed'));
    }

    // ---- Visão e filtros (escrevem a query string) ----

    private navegar(params: Record<string, string | number | null>): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: params, queryParamsHandling: 'merge' });
    }

    mudarVisao(visao: Visao): void {
        if (visao === this.visao) {
            return;
        }
        this.menuAberto = false;
        this.navegar({ visao: visao === 'lista' ? null : visao });
    }

    // Filtro rápido da lateral: grava status e prazo.
    escolherRapido(chave: ChaveFiltroRapido): void {
        const f = FILTROS_RAPIDOS.find(x => x.chave === chave)!;
        this.menuAberto = false;
        this.navegar({
            status: f.status === STATUS_PADRAO ? null : f.status,
            prazo: f.prazo === PRAZO_PADRAO ? null : f.prazo,
        });
    }

    alternarMenu(): void {
        this.menuAberto = !this.menuAberto;
    }

    aoEsc(): void {
        if (this.filtroAberto) {
            this.fecharFiltros();
        } else if (this.menuAberto && !this.ehLg) {
            this.menuAberto = false;
        } else if (this.selecionada) {
            this.fecharDetalhe();
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
            prioridade: this.fPrioridade.value ?? null,
            membroId: this.fMembro.value || null,
        });
    }

    limparFiltros(): void {
        this.filtroAberto = false;
        // Uma combinação antiga de status/prazo (sem filtro rápido) também volta ao padrão.
        this.navegar(this.rapido === null
            ? { status: null, prioridade: null, membroId: null, prazo: null }
            : { prioridade: null, membroId: null });
    }

    private restaurarFiltros(): void {
        this.fPrioridade.setValue(this.prioridade);
        this.fMembro.setValue(this.membroId);
    }

    // ---- Internos ----

    private lerQuery(q: ParamMap): void {
        this.visao = q.get('visao') === 'quadro' ? 'quadro' : 'lista';

        const status = q.get('status') ?? '';
        this.status = STATUS_VALIDOS.includes(status) ? status : STATUS_PADRAO;

        const prioridade = Number(q.get('prioridade'));
        this.prioridade = Number.isInteger(prioridade) && prioridade >= 1 && prioridade <= 3 ? prioridade : null;

        this.membroId = GUID.test(q.get('membroId') ?? '') ? q.get('membroId') : null;

        const prazo = q.get('prazo') ?? '';
        this.prazo = PRAZO_VALIDOS.includes(prazo) ? prazo : PRAZO_PADRAO;
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
