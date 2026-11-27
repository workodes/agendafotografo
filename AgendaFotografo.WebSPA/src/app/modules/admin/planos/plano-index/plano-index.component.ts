import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { ModulosCatalogo } from 'app/models/DTOs/responses/ModulosCatalogo';
import { PlanoListItem } from 'app/models/DTOs/responses/PlanoListItem';
import { RECORRENCIA_PLANO_ROTULO, RECORRENCIA_PLANO_SUFIXO } from 'app/models/enums/RecorrenciaPlano';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { PaginaCabecalhoComponent } from 'app/modules/shared/components/pagina-cabecalho/pagina-cabecalho.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { PlanoService } from 'app/services/plano.service';
import { configPaginator } from 'app/utils/config-paginator';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { formatarMoeda } from 'app/utils/moeda';
import { abrirRota } from 'app/utils/navegar';
import { PlanoAcoesService } from '../plano-acoes.service';

type Situacao = 'true' | 'false' | 'todos';

// Lista de planos (Admin, plano 24), no desenho dos cadastros (Tipos de evento): busca, filtro de Situação no painel lateral,
// tabela paginada no servidor e a ficha no MatDrawer.
@Component({
    standalone: true,
    selector: 'plano-index',
    templateUrl: './plano-index.component.html',
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
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatMenuModule, MatPaginatorModule,
        MatProgressSpinnerModule, MatSelectModule, MatSidenavModule, MatTableModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective, PaginaCabecalhoComponent,
    ],
})
export class PlanoIndexComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('detailsDrawer') detailsDrawer?: MatDrawer;
    filtroAberto = false;

    dataSource = new MatTableDataSource<PlanoListItem>([]);
    displayedColumns: string[] = ['PLA_NOME', 'PLA_VALOR', 'QtdModulos', 'QtdAssinantes', 'PLA_ATIVO', 'Acoes'];
    readonly recorrenciaRotulo = RECORRENCIA_PLANO_ROTULO;
    readonly recorrenciaSufixo = RECORRENCIA_PLANO_SUFIXO;
    readonly formatarMoeda = formatarMoeda;
    /** Total de módulos liberáveis do catálogo (o "M" de "N de M"). */
    totalModulos = 0;
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;

    busca = new FormControl('');
    // Rascunho do painel de filtros; só vale depois de "Aplicar". Abre em "Todos" (são poucos planos).
    situacao = new FormControl<Situacao>('todos');
    situacaoAplicada: Situacao = 'todos';

    private _requisicao?: Subscription;
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: PlanoService,
        private _acoes: PlanoAcoesService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    ngOnInit(): void {
        this._title.setTitle('Planos');
        const dados = this._route.snapshot.data['data'];
        const inicial = dados?.lista as PaginatedResponse<PlanoListItem> | undefined;
        this.totalModulos = (dados?.catalogo as ModulosCatalogo | undefined)?.Liberaveis?.length ?? 0;
        if (inicial) {
            this.aplicar(inicial);
        }

        this.busca.valueChanges.pipe(
            debounceTime(600), distinctUntilChanged(), takeUntil(this._destroy$),
        ).subscribe(() => {
            this.page = 0;
            this.carregar();
        });

        // Ficha salva / ação executada: recarrega a listagem
        this._service.alterado$.pipe(takeUntil(this._destroy$)).subscribe(() => this.carregar());

        // Abre/fecha a ficha conforme a rota filha
        this._router.events
            .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this._destroy$))
            .subscribe(() => this.sincronizarFicha());
    }

    // Navegação direta/F5: o drawer só existe depois da view; sincroniza com a rota filha atual.
    ngAfterViewInit(): void {
        setTimeout(() => this.sincronizarFicha());
    }

    ngOnDestroy(): void {
        this._requisicao?.unsubscribe();
        this._destroy$.next();
        this._destroy$.complete();
    }

    carregar(): void {
        this.loading = true;
        this._cdr.markForCheck();
        this._requisicao?.unsubscribe();
        this._requisicao = this._service
            .GetAllPaginated(this.page + 1, this.pageSize, (this.busca.value ?? '').trim(), this.situacaoAplicada)
            .subscribe({
                next: resp => {
                    this.aplicar(resp);
                    this.loading = false;
                    this._cdr.markForCheck();
                },
                error: error => {
                    this.loading = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível carregar os planos.'), 'X', { duration: 6000 });
                    this._cdr.markForCheck();
                },
            });
    }

    // Há filtro aplicado diferente do padrão (Todos).
    get filtrosAtivos(): boolean {
        return this.situacaoAplicada !== 'todos';
    }

    /** "R$ 49,90/mês". */
    valor(p: PlanoListItem): string {
        return `${formatarMoeda(p.PLA_VALOR)}${this.recorrenciaSufixo[p.PLA_RECORRENCIA] ?? ''}`;
    }

    /** Só plano sem assinantes e fora do autocadastro pode ser excluído (a API confere de novo). */
    podeExcluir(p: PlanoListItem): boolean {
        return !p.PadraoAutocadastro && p.QtdAssinantes === 0;
    }

    // ESC (diretiva): fecha o painel de filtros se aberto; senão a ficha, pelo fluxo normal.
    aoEsc(): void {
        if (this.filtroAberto) {
            this.fecharFiltros();
        } else if (this.detailsDrawer?.opened) {
            this.detailsDrawer.close();
        }
    }

    abrirFiltros(): void {
        if (this.filtroAberto) {
            return;
        }
        this.filtroAberto = true;
    }

    fecharFiltros(): void {
        if (!this.filtroAberto) {
            return;
        }
        this.filtroAberto = false;
        this.restaurarFiltros();
    }

    aplicarFiltros(): void {
        this.situacaoAplicada = this.situacao.value ?? 'todos';
        this.page = 0;
        this.fecharFiltros();
        this.carregar();
    }

    limparFiltros(): void {
        this.situacao.setValue('todos');
        this.aplicarFiltros();
    }

    restaurarFiltros(): void {
        this.situacao.setValue(this.situacaoAplicada);
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregar();
    }

    abrir(row: PlanoListItem, event?: MouseEvent): void {
        abrirRota(this._router, this._route, [row.Id], event);
    }

    inativar(row: PlanoListItem): void {
        this._acoes.inativar(row).subscribe();
    }

    ativar(row: PlanoListItem): void {
        this._acoes.ativar(row).subscribe();
    }

    excluir(row: PlanoListItem): void {
        this._acoes.excluir(row).subscribe();
    }

    fecharFicha(): void {
        this.detailsDrawer?.close();
    }

    onFichaFechada(): void {
        // Volta à rota da listagem quando o drawer é fechado (backdrop/ESC)
        if (this._route.firstChild) {
            this._router.navigate(['./'], { relativeTo: this._route });
        }
    }

    private aplicar(resp: PaginatedResponse<PlanoListItem>): void {
        this.dataSource.data = resp.Data ?? [];
        this.totalCount = resp.TotalCount ?? 0;
        this.page = Math.max((resp.Page ?? 1) - 1, 0);
        this.pageSize = resp.PageSize ?? this.pageSize;
    }

    private sincronizarFicha(): void {
        if (this._route.firstChild) {
            this.fecharFiltros();
            this.detailsDrawer?.open();
        } else {
            this.detailsDrawer?.close();
        }
    }
}
