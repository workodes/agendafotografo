import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDrawer, MatSidenavModule } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs';
import { MembroListItem } from 'app/models/DTOs/responses/MembroListItem';
import { FUNCAO_MEMBRO, FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { MembroService } from 'app/services/membro.service';
import { configPaginator } from 'app/utils/config-paginator';
import { formatTelefone } from 'app/utils/format-telefone';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';

type Situacao = 'true' | 'false' | 'todos';

@Component({
    standalone: true,
    selector: 'membro-index',
    templateUrl: './membro-index.component.html',
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
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule,
        MatProgressSpinnerModule, MatSelectModule, MatSidenavModule, MatTableModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective,
    ],
})
export class MembroIndexComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('detailsDrawer') detailsDrawer?: MatDrawer;
    filtroAberto = false;

    dataSource = new MatTableDataSource<MembroListItem>([]);
    displayedColumns: string[] = ['MEM_NOME', 'MEM_INSTAGRAM', 'MEM_FUNCAO', 'MEM_TELEFONE', 'MEM_ATIVO'];
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;

    busca = new FormControl('');
    // Rascunho do painel de filtros; só vale depois de "Aplicar" (copiado para `situacaoAplicada`). Abre em "Ativos".
    situacao = new FormControl<Situacao>('true');
    situacaoAplicada: Situacao = 'true';
    // Função (enum FuncaoMembro); null = todas.
    funcao = new FormControl<number | null>(null);
    funcaoAplicada: number | null = null;

    funcoes = FUNCAO_MEMBRO;
    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;
    formatTelefone = formatTelefone;

    private _requisicao?: Subscription;
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: MembroService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    ngOnInit(): void {
        this._title.setTitle('Equipe');
        const inicial = this._route.snapshot.data['data']?.lista as PaginatedResponse<MembroListItem> | undefined;
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
            .GetAllPaginated(this.page + 1, this.pageSize, (this.busca.value ?? '').trim(), this.situacaoAplicada, this.funcaoAplicada)
            .subscribe({
                next: resp => {
                    this.aplicar(resp);
                    this.loading = false;
                    this._cdr.markForCheck();
                },
                error: error => {
                    this.loading = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível carregar a equipe.'), 'X', { duration: 6000 });
                    this._cdr.markForCheck();
                },
            });
    }

    // Há filtro aplicado diferente do padrão (Ativos, todas as funções).
    get filtrosAtivos(): boolean {
        return this.situacaoAplicada !== 'true' || this.funcaoAplicada !== null;
    }

    // ESC (diretiva): fecha o painel de filtros se aberto (restaura o rascunho); senão a ficha, pelo fluxo normal
    // (closedStart -> onFichaFechada volta à listagem).
    aoEsc(): void {
        if (this.filtroAberto) {
            this.fecharFiltros();
        } else if (this.detailsDrawer?.opened) {
            this.detailsDrawer.close();
        }
    }

    // Idempotentes: repetir abrir/fechar não tem efeito e não restaura o rascunho com o painel já fechado.
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
        this.situacaoAplicada = this.situacao.value ?? 'true';
        this.funcaoAplicada = this.funcao.value ?? null;
        this.page = 0;
        this.fecharFiltros();
        this.carregar();
    }

    limparFiltros(): void {
        this.situacao.setValue('true');
        this.funcao.setValue(null);
        this.aplicarFiltros();
    }

    // Fechou sem aplicar: o rascunho volta ao que está aplicado.
    restaurarFiltros(): void {
        this.situacao.setValue(this.situacaoAplicada);
        this.funcao.setValue(this.funcaoAplicada);
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregar();
    }

    abrir(row: MembroListItem, event?: MouseEvent): void {
        abrirRota(this._router, this._route, [row.Id], event);
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

    private aplicar(resp: PaginatedResponse<MembroListItem>): void {
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
