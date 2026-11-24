import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { LancamentoFiltro } from 'app/models/DTOs/filters/LancamentoFiltro';
import { LancamentoListItem } from 'app/models/DTOs/responses/LancamentoListItem';
import { LancamentoResumo } from 'app/models/DTOs/responses/LancamentoResumo';
import { CATEGORIA_LANCAMENTO_ROTULO } from 'app/models/enums/CategoriaLancamento';
import { TIPO_LANCAMENTO_ROTULO, TipoLancamento } from 'app/models/enums/TipoLancamento';
import { LancamentoService } from 'app/services/lancamento.service';
import { configPaginator } from 'app/utils/config-paginator';
import { formatarData } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { formatarMoeda, formatarMoedaComSinal, formatarSaldo } from 'app/utils/moeda';
import { FinanceiroFiltroService } from '../financeiro-filtro.service';
import { LANCAMENTO_DIALOG_CONFIG, LancamentoDialogComponent } from '../lancamento-dialog/lancamento-dialog.component';

type Estado = 'carregando' | 'pronto' | 'erro';

interface Ordenacao {
    valor: string;
    rotulo: string;
    ordenar: string;
    sentido: string;
}

const ORDENACOES: Ordenacao[] = [
    { valor: 'data_desc', rotulo: 'Mais recentes', ordenar: 'data', sentido: 'desc' },
    { valor: 'data_asc', rotulo: 'Mais antigos', ordenar: 'data', sentido: 'asc' },
    { valor: 'valor_desc', rotulo: 'Maior valor', ordenar: 'valor', sentido: 'desc' },
    { valor: 'valor_asc', rotulo: 'Menor valor', ordenar: 'valor', sentido: 'asc' },
    { valor: 'titulo_asc', rotulo: 'Título A a Z', ordenar: 'titulo', sentido: 'asc' },
];

// Aba Lançamentos do Financeiro (plano 22): cartões (Receitas, Despesas, Saldo, Lançamentos), busca, ordenação e lista paginada
// no servidor. Período vem do FinanceiroFiltroService; os cartões acompanham período e busca (os mesmos filtros da lista).
@Component({
    selector: 'app-lancamentos',
    standalone: true,
    templateUrl: './lancamentos.component.html',
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
    imports: [
        CommonModule, ReactiveFormsModule,
        MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule,
        MatProgressSpinnerModule, MatSelectModule, MatTableModule,
    ],
})
export class LancamentosComponent implements OnInit {
    private _service = inject(LancamentoService);
    private _filtro = inject(FinanceiroFiltroService);
    private _dialog = inject(MatDialog);
    private _cdr = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);

    readonly Receita = TipoLancamento.Receita;
    readonly Despesa = TipoLancamento.Despesa;
    readonly tipoRotulo = TIPO_LANCAMENTO_ROTULO;
    readonly categoriaRotulo = CATEGORIA_LANCAMENTO_ROTULO;
    readonly ordenacoes = ORDENACOES;
    readonly formatarMoeda = formatarMoeda;
    readonly formatarSaldo = formatarSaldo;
    readonly formatarMoedaComSinal = formatarMoedaComSinal;
    readonly formatarData = formatarData;
    readonly colunas = ['LAN_DATA', 'LAN_TITULO', 'LAN_CATEGORIA', 'LAN_TIPO', 'LAN_VALOR'];
    readonly esqueleto = [1, 2, 3, 4];

    busca = new FormControl('', { nonNullable: true });
    ordenacao = new FormControl<string>('data_desc', { nonNullable: true });

    estadoLista: Estado = 'carregando';
    estadoResumo: Estado = 'carregando';
    erroLista = '';
    itens: LancamentoListItem[] = [];
    resumo: LancamentoResumo | null = null;
    page = 0;
    pageSize = 25;
    totalCount = 0;

    private _subLista?: Subscription;
    private _subResumo?: Subscription;

    ngOnInit(): void {
        // O período emite ao assinar (BehaviorSubject): é a carga inicial e também a de cada mudança do seletor.
        this._filtro.periodo$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.page = 0;
            this.carregar();
        });

        this.busca.valueChanges.pipe(debounceTime(600), distinctUntilChanged(), takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.page = 0;
            this.carregar();
        });

        this.ordenacao.valueChanges.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.page = 0;
            this.carregarLista();
        });

        // Criar, editar ou excluir (modal): recarrega a lista e os cartões.
        this._service.alterado$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.carregar());

        this._destroyRef.onDestroy(() => {
            this._subLista?.unsubscribe();
            this._subResumo?.unsubscribe();
        });
    }

    private filtro(comOrdem: boolean): LancamentoFiltro {
        const periodo = this._filtro.periodo;
        const filtro: LancamentoFiltro = { busca: this.busca.value.trim(), dataDe: periodo.dataDe, dataAte: periodo.dataAte };
        if (comOrdem) {
            const o = ORDENACOES.find(x => x.valor === this.ordenacao.value) ?? ORDENACOES[0];
            filtro.ordenar = o.ordenar;
            filtro.sentido = o.sentido;
        }
        return filtro;
    }

    carregar(): void {
        this.carregarLista();
        this.carregarResumo();
    }

    carregarLista(): void {
        this.estadoLista = 'carregando';
        this._cdr.markForCheck();
        this._subLista?.unsubscribe();
        this._subLista = this._service.GetAllPaginated(this.page + 1, this.pageSize, this.filtro(true)).subscribe({
            next: resp => {
                this.itens = resp.Data ?? [];
                this.totalCount = resp.TotalCount ?? 0;
                this.page = Math.max((resp.Page ?? 1) - 1, 0);
                this.pageSize = resp.PageSize ?? this.pageSize;
                this.estadoLista = 'pronto';
                this._cdr.markForCheck();
            },
            error: error => {
                this.erroLista = mensagemErro(error, 'Não foi possível carregar os lançamentos.');
                this.estadoLista = 'erro';
                this._cdr.markForCheck();
            },
        });
    }

    carregarResumo(): void {
        this.estadoResumo = 'carregando';
        this._cdr.markForCheck();
        this._subResumo?.unsubscribe();
        this._subResumo = this._service.Resumo(this.filtro(false)).subscribe({
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

    get filtrando(): boolean {
        return !!this.busca.value.trim();
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregarLista();
    }

    novo(tipo: number): void {
        this._dialog.open(LancamentoDialogComponent, { ...LANCAMENTO_DIALOG_CONFIG, data: { tipo } });
    }

    abrir(item: LancamentoListItem): void {
        this._dialog.open(LancamentoDialogComponent, { ...LANCAMENTO_DIALOG_CONFIG, data: { id: item.Id } });
    }

    // Texto lido pelo leitor de tela na linha/cartão.
    descricao(l: LancamentoListItem): string {
        return `${this.tipoRotulo[l.LAN_TIPO]}, ${l.LAN_TITULO}, ${formatarMoeda(l.LAN_VALOR)}, ${formatarData(l.LAN_DATA)}`;
    }

    trackItem(_: number, l: LancamentoListItem): string {
        return l.Id;
    }
}
