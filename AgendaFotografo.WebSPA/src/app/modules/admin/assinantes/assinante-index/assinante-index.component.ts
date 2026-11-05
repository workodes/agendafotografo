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
import { AssinanteListItem } from 'app/models/DTOs/responses/AssinanteListItem';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { AssinanteService } from 'app/services/assinante.service';
import { configPaginator } from 'app/utils/config-paginator';
import { formatCpfCnpj } from 'app/utils/format-cpf-cnpj';
import { formatTelefone } from 'app/utils/format-telefone';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { AssinanteAcoesService } from '../assinante-acoes.service';

@Component({
    standalone: true,
    selector: 'assinante-index',
    templateUrl: './assinante-index.component.html',
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
    ],
})
export class AssinanteIndexComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('detailsDrawer') detailsDrawer?: MatDrawer;

    dataSource = new MatTableDataSource<AssinanteListItem>([]);
    displayedColumns: string[] = ['ASS_NOME', 'ASS_EMAIL', 'ASS_TELEFONE', 'ASS_CPF_CNPJ', 'ASS_ATIVO', 'LastLogin', 'Acoes'];
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;

    busca = new FormControl('');
    // A lista abre filtrada em "Ativos".
    situacao = new FormControl<'true' | 'false' | 'todos'>('true');

    formatCpfCnpj = formatCpfCnpj;
    formatTelefone = formatTelefone;
    private _requisicao?: Subscription;
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: AssinanteService,
        private _acoes: AssinanteAcoesService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    ngOnInit(): void {
        this._title.setTitle('Assinantes');
        const inicial = this._route.snapshot.data['data']?.lista as PaginatedResponse<AssinanteListItem> | undefined;
        if (inicial) {
            this.aplicar(inicial);
        }

        this.busca.valueChanges.pipe(
            debounceTime(600), distinctUntilChanged(), takeUntil(this._destroy$),
        ).subscribe(() => {
            this.page = 0;
            this.carregar();
        });

        this.situacao.valueChanges.pipe(takeUntil(this._destroy$)).subscribe(() => {
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
            .GetAllPaginated(this.page + 1, this.pageSize, (this.busca.value ?? '').trim(), this.situacao.value ?? 'true')
            .subscribe({
                next: resp => {
                    this.aplicar(resp);
                    this.loading = false;
                    this._cdr.markForCheck();
                },
                error: error => {
                    this.loading = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível carregar os assinantes.'), 'X', { duration: 6000 });
                    this._cdr.markForCheck();
                },
            });
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregar();
    }

    abrir(row: AssinanteListItem): void {
        this._router.navigate([row.Id], { relativeTo: this._route });
    }

    bloquear(row: AssinanteListItem): void {
        this._acoes.bloquear(row).subscribe();
    }

    reativar(row: AssinanteListItem): void {
        this._acoes.reativar(row).subscribe();
    }

    redefinirAcesso(row: AssinanteListItem): void {
        this._acoes.redefinirAcesso(row).subscribe();
    }

    onFichaFechada(): void {
        // Volta à rota da listagem quando o drawer é fechado (backdrop/ESC)
        if (this._route.firstChild) {
            this._router.navigate(['./'], { relativeTo: this._route });
        }
    }

    private aplicar(resp: PaginatedResponse<AssinanteListItem>): void {
        this.dataSource.data = resp.Data ?? [];
        this.totalCount = resp.TotalCount ?? 0;
        this.page = Math.max((resp.Page ?? 1) - 1, 0);
        this.pageSize = resp.PageSize ?? this.pageSize;
    }

    private sincronizarFicha(): void {
        if (this._route.firstChild) {
            this.detailsDrawer?.open();
        } else {
            this.detailsDrawer?.close();
        }
    }
}
