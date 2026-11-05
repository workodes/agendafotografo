import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { EventoFiltro } from 'app/models/DTOs/filters/EventoFiltro';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { STATUS_EVENTO, STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO } from 'app/models/enums/StatusEvento';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { EventoService } from 'app/services/evento.service';
import { configPaginator } from 'app/utils/config-paginator';
import { diaSemanaCurto, formatarDataIso, formatarDiaMes, formatarHora, hojeIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';

// Filtros aplicados à listagem (período, status, tipo e organizador). Datas "yyyy-MM-dd".
interface FiltrosAplicados {
    dataDe: string | null;
    dataAte: string | null;
    status: number | null;
    tipoEventoId: string | null;
    organizadorId: string | null;
}

@Component({
    standalone: true,
    selector: 'evento-index',
    templateUrl: './evento-index.component.html',
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
        MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule,
        MatProgressSpinnerModule, MatSelectModule, MatTableModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective,
    ],
})
export class EventoIndexComponent implements OnInit, OnDestroy {
    filtroAberto = false;

    dataSource = new MatTableDataSource<EventoListItem>([]);
    displayedColumns: string[] = ['EVE_DATA', 'EVE_HORA', 'EVE_NOME', 'TipoEventoNome', 'EVE_CIDADE', 'Equipe', 'EVE_STATUS'];
    page = 0;
    pageSize = 25;
    totalCount = 0;
    loading = false;

    busca = new FormControl('');

    // Rascunho do painel de filtros; só vale depois de "Aplicar" (copiado para `aplicados`).
    dataDe = new FormControl<Date | null>(null);
    dataAte = new FormControl<Date | null>(null);
    status = new FormControl<number | null>(null);
    tipoEventoId = new FormControl<string | null>(null);
    organizadorId = new FormControl<string | null>(null);
    aplicados: FiltrosAplicados = this.padrao();

    tipos: Opcao[] = [];
    organizadores: Opcao[] = [];
    statusLista = STATUS_EVENTO;
    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;

    private _requisicao?: Subscription;
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
    ) { }

    ngOnInit(): void {
        this._title.setTitle('Eventos');

        // O resolver roda a cada mudança de query string (?organizadorId=, ?status= ...); data emite na criação e a cada nova carga.
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            const d = data['data'];
            if (!d) {
                return;
            }
            this.tipos = d.tipos ?? [];
            this.organizadores = d.organizadores ?? [];
            this.aplicados = this.filtrosDaQuery();
            this.busca.setValue('', { emitEvent: false }); // a carga do resolver não leva a busca
            this.restaurarFiltros();
            this.aplicar(d.lista as PaginatedResponse<EventoListItem>);
            this._cdr.markForCheck();
        });

        this.busca.valueChanges.pipe(
            debounceTime(600), distinctUntilChanged(), takeUntil(this._destroy$),
        ).subscribe(() => {
            this.page = 0;
            this.carregar();
        });

        // Evento criado/alterado/excluído ou escala mudou: recarrega a listagem
        this._service.alterado$.pipe(takeUntil(this._destroy$)).subscribe(() => this.carregar());
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
        const filtro: EventoFiltro = {
            busca: (this.busca.value ?? '').trim(),
            ...this.aplicados,
            ordem: 'asc',
        };
        this._requisicao = this._service.GetAllPaginated(this.page + 1, this.pageSize, filtro).subscribe({
            next: resp => {
                this.aplicar(resp);
                this.loading = false;
                this._cdr.markForCheck();
            },
            error: error => {
                this.loading = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível carregar os eventos.'), 'X', { duration: 6000 });
                this._cdr.markForCheck();
            },
        });
    }

    // Há filtro aplicado diferente do padrão (a partir de hoje, sem fim, sem status, tipo ou organizador).
    get filtrosAtivos(): boolean {
        const p = this.padrao();
        const a = this.aplicados;
        return a.dataDe !== p.dataDe || a.dataAte !== p.dataAte || a.status !== p.status
            || a.tipoEventoId !== p.tipoEventoId || a.organizadorId !== p.organizadorId;
    }

    // ESC (diretiva): fecha o painel de filtros se aberto (restaura o rascunho).
    aoEsc(): void {
        if (this.filtroAberto) {
            this.fecharFiltros();
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
        this.aplicados = {
            dataDe: this.dataDe.value ? formatarDataIso(this.dataDe.value) : null,
            dataAte: this.dataAte.value ? formatarDataIso(this.dataAte.value) : null,
            status: this.status.value ?? null,
            tipoEventoId: this.tipoEventoId.value ?? null,
            organizadorId: this.organizadorId.value ?? null,
        };
        this.page = 0;
        this.fecharFiltros();
        this.carregar();
    }

    // Volta ao padrão: a partir de hoje, sem os demais filtros.
    limparFiltros(): void {
        this.dataDe.setValue(parseDataIso(hojeIso()));
        this.dataAte.setValue(null);
        this.status.setValue(null);
        this.tipoEventoId.setValue(null);
        this.organizadorId.setValue(null);
        this.aplicarFiltros();
    }

    // Fechou sem aplicar: o rascunho volta ao que está aplicado.
    restaurarFiltros(): void {
        this.dataDe.setValue(parseDataIso(this.aplicados.dataDe));
        this.dataAte.setValue(parseDataIso(this.aplicados.dataAte));
        this.status.setValue(this.aplicados.status);
        this.tipoEventoId.setValue(this.aplicados.tipoEventoId);
        this.organizadorId.setValue(this.aplicados.organizadorId);
    }

    onPage(event: PageEvent): void {
        this.page = event.pageIndex;
        this.pageSize = event.pageSize;
        this.carregar();
    }

    abrir(row: EventoListItem, event?: MouseEvent): void {
        abrirRota(this._router, this._route, [row.Id], event);
    }

    // "15/11" (com "/aa" quando o ano não é o atual).
    data(e: EventoListItem): string {
        const d = parseDataIso(e.EVE_DATA);
        const base = formatarDiaMes(e.EVE_DATA);
        return d && d.getFullYear() !== new Date().getFullYear() ? `${base}/${String(d.getFullYear()).slice(2)}` : base;
    }

    diaSemana(e: EventoListItem): string {
        return diaSemanaCurto(e.EVE_DATA);
    }

    hora(e: EventoListItem): string {
        return formatarHora(e.EVE_HORA);
    }

    // "@instagram" (ou o nome, sem Instagram) de cada escalado.
    equipe(e: EventoListItem): string {
        return (e.Equipe ?? []).map(m => (m.MEM_INSTAGRAM ? '@' + m.MEM_INSTAGRAM : m.MEM_NOME)).join(', ');
    }

    private padrao(): FiltrosAplicados {
        return { dataDe: hojeIso(), dataAte: null, status: null, tipoEventoId: null, organizadorId: null };
    }

    // Filtros da query string (mesma regra do resolver): sem ?dataDe= vale hoje; ?dataDe= vazio = sem limite inferior.
    private filtrosDaQuery(): FiltrosAplicados {
        const q = this._route.snapshot.queryParamMap;
        const status = Number(q.get('status'));
        const dataDe = q.get('dataDe');
        return {
            dataDe: dataDe === null ? hojeIso() : (parseDataIso(dataDe) ? dataDe : null),
            dataAte: parseDataIso(q.get('dataAte')) ? q.get('dataAte') : null,
            status: status >= 1 && status <= 4 ? status : null,
            tipoEventoId: q.get('tipoEventoId') || null,
            organizadorId: q.get('organizadorId') || null,
        };
    }

    private aplicar(resp: PaginatedResponse<EventoListItem>): void {
        this.dataSource.data = resp.Data ?? [];
        this.totalCount = resp.TotalCount ?? 0;
        this.page = Math.max((resp.Page ?? 1) - 1, 0);
        this.pageSize = resp.PageSize ?? this.pageSize;
    }
}
