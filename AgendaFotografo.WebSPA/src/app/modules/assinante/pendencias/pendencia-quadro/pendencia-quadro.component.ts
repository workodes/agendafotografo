import { CdkDragDrop, DragDropModule, transferArrayItem } from '@angular/cdk/drag-drop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, catchError, forkJoin, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { PRIORIDADE_PENDENCIA_COR, PRIORIDADE_PENDENCIA_ROTULO } from 'app/models/enums/PrioridadePendencia';
import { STATUS_PENDENCIA_ROTULO, StatusPendencia } from 'app/models/enums/StatusPendencia';
import { EventoService } from 'app/services/evento.service';
import { formatarDataComDiaSemana } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';
import { formatarPrazo } from 'app/utils/pendencia';
import { PENDENCIA_DIALOG_CONFIG, PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado } from '../pendencia-dialog/pendencia-dialog.component';
import { PendenciaStatusChipComponent } from '../pendencia-status-chip/pendencia-status-chip.component';

interface ColunaQuadro {
    status: number;
    rotulo: string;
    itens: EventoPendenciaItem[];
    total: number;
}

const LIMITE_COLUNA = 100;

/**
 * Visão Quadro da tela Pendências (molde: scrumboard do Fuse): A fazer, Em andamento e Concluída lado a lado; arrastar o cartão para
 * outra coluna muda o status (`AtualizarStatusPendencia`). Ignoradas ficam fora. Carrega 3 vezes `ListarPendencias` (status 1, 2 e 3; até 100 cada)
 * com a Prioridade e o Responsável da tela. Abaixo de `md` não há arrasto: abas escolhem a coluna e o chip muda o status.
 * `ViewEncapsulation.None` porque o preview do arrasto vai para o body.
 */
@Component({
    standalone: true,
    selector: 'app-pendencia-quadro',
    templateUrl: './pendencia-quadro.component.html',
    styleUrls: ['./pendencia-quadro.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { class: 'block w-full min-w-0' },
    imports: [
        CommonModule, DragDropModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressSpinnerModule, PendenciaStatusChipComponent,
    ],
})
export class PendenciaQuadroComponent implements OnInit, OnChanges, OnDestroy {
    @Input() prioridade: number | null = null;
    @Input() membroId: string | null = null;

    colunas: ColunaQuadro[] = [
        { status: StatusPendencia.AFazer, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.AFazer], itens: [], total: 0 },
        { status: StatusPendencia.EmAndamento, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.EmAndamento], itens: [], total: 0 },
        { status: StatusPendencia.Concluida, rotulo: STATUS_PENDENCIA_ROTULO[StatusPendencia.Concluida], itens: [], total: 0 },
    ];
    colunaMobile: number = StatusPendencia.AFazer;
    ehMd = true;
    loading = false;
    carregou = false;
    erroCarga = false;
    arrastando = false;

    readonly limite = LIMITE_COLUNA;
    readonly atrasoToque = { touch: 150, mouse: 0 };
    concluida = StatusPendencia.Concluida;
    prioridadeRotulo = PRIORIDADE_PENDENCIA_ROTULO;
    prioridadeCor = PRIORIDADE_PENDENCIA_COR;
    formatarPrazo = formatarPrazo;
    formatarDataComDiaSemana = formatarDataComDiaSemana;

    private _carga$ = new Subject<void>();
    private _destroy$ = new Subject<void>();

    constructor(
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _router: Router,
        private _route: ActivatedRoute,
        private _breakpoint: BreakpointObserver,
        private _cdr: ChangeDetectorRef,
    ) { }

    ngOnInit(): void {
        this._breakpoint.observe('(min-width: 960px)').pipe(takeUntil(this._destroy$)).subscribe(r => {
            this.ehMd = r.matches;
            this._cdr.markForCheck();
        });

        // Uma carga por vez: a anterior é cancelada quando outra começa.
        this._carga$.pipe(
            tap(() => {
                this.loading = true;
                this._cdr.markForCheck();
            }),
            switchMap(() => {
                const filtro = (status: StatusPendencia) => ({ status: String(status), prioridade: this.prioridade, membroId: this.membroId });
                return forkJoin(this.colunas.map(c => this._service.ListarPendencias(1, LIMITE_COLUNA, filtro(c.status)))).pipe(
                    map(resps => ({ resps, erro: null as any })),
                    catchError(erro => of({ resps: null, erro })),
                );
            }),
            takeUntil(this._destroy$),
        ).subscribe(r => {
            this.loading = false;
            this.erroCarga = !!r.erro;
            if (r.erro) {
                this._snackBar.open(mensagemErro(r.erro, 'Não foi possível carregar o quadro.'), 'X', { duration: 6000 });
            } else {
                this.colunas.forEach((c, i) => {
                    c.itens = r.resps![i].Data ?? [];
                    c.total = r.resps![i].TotalCount ?? 0;
                });
                this.carregou = true;
            }
            this._cdr.markForCheck();
        });

        this.carregar();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ((changes['prioridade'] || changes['membroId']) && !changes['prioridade']?.firstChange && !changes['membroId']?.firstChange) {
            this.carregar();
        }
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    /** Relê as 3 colunas (os dados antigos ficam visíveis, esmaecidos, até chegar a resposta). */
    carregar(): void {
        this._carga$.next();
    }

    // ---- Arrasto ----

    soltou(event: CdkDragDrop<ColunaQuadro>): void {
        if (event.previousContainer === event.container) {
            return; // não há posição gravada: soltar na mesma coluna não faz nada
        }
        const origem = event.previousContainer.data;
        const destino = event.container.data;
        const item: EventoPendenciaItem = event.item.data;

        // Troca de lugar na hora; reverte se a API falhar.
        transferArrayItem(origem.itens, destino.itens, event.previousIndex, event.currentIndex);
        origem.total = Math.max(0, origem.total - 1);
        destino.total += 1;

        this._service.AtualizarStatusPendencia(item.Id, { EVP_STATUS: destino.status }).subscribe({
            next: atualizado => {
                const i = destino.itens.findIndex(x => x.Id === item.Id);
                if (i >= 0) {
                    destino.itens[i] = atualizado;
                }
                this._service.NotificarAlteracao(); // sino e contadores da tela
                this._cdr.markForCheck();
            },
            error: error => {
                this._snackBar.open(mensagemErro(error, 'Não foi possível mudar o status.'), 'X', { duration: 6000 });
                this.carregar();
            },
        });
    }

    fimArrasto(): void {
        // O clique que fecha o arrasto não pode abrir o modal.
        setTimeout(() => this.arrastando = false);
    }

    // ---- Abrir ----

    abrir(p: EventoPendenciaItem): void {
        if (this.arrastando) {
            return;
        }
        const data: PendenciaDialogData = { eventoId: p.EVP_EVENTO_ID, eventoNome: p.EVE_NOME, eventoData: p.EVE_DATA, pendencia: p };
        this._dialog.open<PendenciaDialogComponent, PendenciaDialogData, PendenciaDialogResultado>(PendenciaDialogComponent, { ...PENDENCIA_DIALOG_CONFIG, data })
            .afterClosed().subscribe(r => {
                if (r) {
                    this._service.NotificarAlteracao();
                    this._snackBar.open(r.acao === 'excluida' ? 'Pendência excluída.' : 'Pendência salva.', 'X', { duration: 3000 });
                    this.carregar();
                }
            });
    }

    abrirEvento(p: EventoPendenciaItem, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/assinante/eventos', p.EVP_EVENTO_ID], event);
    }

    trackPendencia = (_: number, p: EventoPendenciaItem) => p.Id;
}
