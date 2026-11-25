import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, catchError, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { EscalaItem } from 'app/models/DTOs/responses/EscalaItem';
import { StatusEvento } from 'app/models/enums/StatusEvento';
import { EscalaService } from 'app/services/escala.service';
import {
    CABECALHO_SEMANA, DiaDaGrade, gradeDoMes, intervaloDaGrade, mesAnterior, mesAtual, mesDaData, mesSeguinte, mesValido, nomeDoMes,
} from 'app/utils/calendario';
import { diaSemana, formatarData, formatarDiaMes, formatarHora, hojeIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';

type Visao = 'lista' | 'calendario';

/**
 * Item da agenda do Fotógrafo: evento de um coordenador em que ele foi escalado (pelo documento, CPF ou CNPJ, gravado na Equipe).
 * Somente leitura; abre `/fotografo/escalas/:id`.
 */
export interface ItemAgenda {
    chave: string;
    id: string;
    nome: string;
    /** "yyyy-MM-dd" */
    data: string;
    hora: string | null;
    cidade: string;
    local: string | null;
    /** `StatusEvento.Cancelado` quando cancelado; 0 nos demais (a equipe não vê o status). */
    status: number;
    /** "Equipe de <Coordenador>" e a posição do fotógrafo (quando houver). */
    etiqueta: string;
    posicao: string | null;
}

interface Celula { dia: DiaDaGrade; itens: ItemAgenda[]; rotulo: string; }
interface GrupoDia { data: string; titulo: string; itens: ItemAgenda[]; }

function daEquipe(e: EscalaItem): ItemAgenda {
    return {
        chave: `equipe:${e.EventoId}`, id: e.EventoId, nome: e.EVE_NOME, data: (e.EVE_DATA ?? '').substring(0, 10),
        hora: e.EVE_HORA ?? null, cidade: e.EVE_CIDADE, local: e.EVE_LOCAL ?? null,
        // Só o cancelado tem selo; o resto da equipe não mostra status.
        status: e.Cancelado ? StatusEvento.Cancelado : 0,
        etiqueta: `Equipe de ${e.CoordenadorNome}`, posicao: e.EVM_POSICAO ?? null,
    };
}

// Data, hora (sem hora por último), nome.
function comparar(a: ItemAgenda, b: ItemAgenda): number {
    return a.data.localeCompare(b.data)
        || (a.hora ?? '99:99:99').localeCompare(b.hora ?? '99:99:99')
        || a.nome.localeCompare(b.nome, 'pt-BR')
        || a.chave.localeCompare(b.chave);
}

/**
 * Agenda do Fotógrafo (planos 20 e 21): molde enxuto da Agenda do assinante, sem filtros, só com os eventos em que
 * algum coordenador o escalou pelo CPF (uma carga por mês: `Escala/Listar`). A agenda pessoal foi desligada no plano 21.
 */
@Component({
    selector: 'agenda-fotografo',
    templateUrl: './agenda-fotografo.component.html',
    standalone: true,
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [CommonModule, RouterModule, MatButtonModule, MatButtonToggleModule, MatIconModule, MatProgressSpinnerModule],
})
export class AgendaFotografoComponent implements OnInit, OnDestroy {
    // ---- Estado vindo da query string (?mes=&visao=&dia=) ----
    mes = mesAtual();
    dia: string | null = null;

    // ---- Dados ----
    itens: ItemAgenda[] = [];
    celulas: Celula[] = [];
    grupos: GrupoDia[] = [];
    loading = false;
    erroCarga = false;

    cancelado = StatusEvento.Cancelado;
    /** Pílula do calendário (md+): índigo; cancelado em cinza. */
    pilula(i: ItemAgenda): string {
        return i.status === StatusEvento.Cancelado ? 'bg-gray-200 text-gray-600' : 'bg-indigo-100 text-indigo-900';
    }
    ponto(i: ItemAgenda): string {
        return i.status === StatusEvento.Cancelado ? 'bg-gray-400' : 'bg-indigo-500';
    }
    cabecalho = CABECALHO_SEMANA;
    formatarHora = formatarHora;
    hoje = hojeIso();

    private _visaoQuery: Visao | null = null;
    private _ehMd = false;
    private _chave = '';
    private _visaoAtual: Visao | null = null;
    private _rolar = false;
    private _diaQuery: string | null = null;
    @ViewChild('rolagem') private _rolagem?: ElementRef<HTMLElement>;
    private _carga$ = new Subject<void>();
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _escalaService: EscalaService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
        private _breakpoint: BreakpointObserver,
    ) { }

    // Sem ?visao= vale Lista abaixo de md e Calendário a partir de md.
    get visao(): Visao {
        return this._visaoQuery ?? (this._ehMd ? 'calendario' : 'lista');
    }

    get nomeMes(): string {
        return nomeDoMes(this.mes);
    }

    get ehMesAtual(): boolean {
        return this.mes === mesAtual();
    }

    // "Nenhum evento em novembro." (só o nome do mês, sem o ano).
    get mensagemVazia(): string {
        return `Nenhum evento em ${nomeDoMes(this.mes, false).split(' ')[0]}.`;
    }

    get itensDoDiaSelecionado(): ItemAgenda[] {
        return this.dia ? this.celulas.find(c => c.dia.data === this.dia)?.itens ?? [] : [];
    }

    get tituloDia(): string {
        return this.dia ? `${this.diaSemanaMaiuscula(this.dia)}, ${formatarData(this.dia)}` : '';
    }

    ngOnInit(): void {
        this._title.setTitle('Agenda');

        this._breakpoint.observe('(min-width: 960px)').pipe(takeUntil(this._destroy$)).subscribe(r => {
            this._ehMd = r.matches;
            this._cdr.markForCheck();
        });
        this._ehMd = this._breakpoint.isMatched('(min-width: 960px)');

        // Uma carga por vez: a requisição anterior é cancelada quando outra começa.
        this._carga$.pipe(
            tap(() => {
                this.loading = true;
                this._cdr.markForCheck();
            }),
            switchMap(() => this.carregar()),
            takeUntil(this._destroy$),
        ).subscribe(r => {
            this.loading = false;
            this.erroCarga = !!r.erro;
            this.itens = r.itens;
            if (r.erro) {
                this._snackBar.open(mensagemErro(r.erro, 'Não foi possível carregar a agenda.'), 'X', { duration: 6000 });
            }
            this.montar();
            this.rolarParaDia();
            this._cdr.markForCheck();
        });

        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            const visaoAntes = this._visaoAtual;
            const mesAntes = this.mes;
            this.lerQuery(q);
            this._visaoAtual = this.visao;
            if (this.mes !== this._chave) {
                this._chave = this.mes;
                this._rolar = this.visao === 'lista';
                if (this.mes !== mesAntes && this._rolagem) {
                    this._rolagem.nativeElement.scrollTop = 0;
                }
                this.montar();
                this._carga$.next();
            } else {
                this.montar();
                if (this.visao === 'lista' && visaoAntes !== 'lista') {
                    this._rolar = true;
                    this.rolarParaDia();
                }
            }
            this._cdr.markForCheck();
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    /** Carga do mês (grade de 42 dias): uma chamada só (`Escala/Listar`); o erro vira a tela cheia com "Tentar de novo". */
    private carregar() {
        const { dataDe, dataAte } = intervaloDaGrade(this.mes);
        return this._escalaService.Listar(dataDe, dataAte).pipe(
            map(lista => ({ itens: lista.map(daEquipe).sort(comparar), erro: null as any })),
            catchError(erro => of({ itens: [] as ItemAgenda[], erro })),
        );
    }

    // ---- Navegação (escreve a query string) ----

    private navegar(params: Record<string, string | null>, replaceUrl = false): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: params, queryParamsHandling: 'merge', replaceUrl });
    }

    mesAnterior(): void { this.navegar({ mes: mesAnterior(this.mes), dia: null }); }
    mesSeguinte(): void { this.navegar({ mes: mesSeguinte(this.mes), dia: null }); }
    irParaHoje(): void { this.navegar({ mes: mesAtual(), dia: null }); }
    tentarDeNovo(): void { this._carga$.next(); }

    mudarVisao(v: Visao): void {
        if (v !== this.visao) {
            this.navegar({ visao: v });
        }
    }

    // Toque no dia: seleciona (sem nova entrada no histórico); dia de outro mês muda o mês.
    selecionarDia(c: Celula): void {
        if (c.dia.foraDoMes) {
            this.navegar({ mes: mesDaData(c.dia.data), dia: c.dia.data });
        } else {
            this.navegar({ dia: c.dia.data }, true);
        }
    }

    /** Abre a tela somente leitura do evento da equipe. */
    abrirItem(item: ItemAgenda, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/fotografo/escalas', item.id], event);
    }

    // ---- Apresentação ----

    trackCelula = (_: number, c: Celula) => c.dia.data;
    trackGrupo = (_: number, g: GrupoDia) => g.data;
    trackItem = (_: number, i: ItemAgenda) => i.chave;

    localCidade(i: ItemAgenda): string {
        return [i.local, i.cidade].filter(x => !!x).join(' · ');
    }

    private diaSemanaMaiuscula(iso: string): string {
        const s = diaSemana(iso);
        return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    }

    // ---- Internos ----

    private lerQuery(q: ParamMap): void {
        this.hoje = hojeIso();
        const mes = q.get('mes');
        this.mes = mesValido(mes) ? mes! : mesAtual();

        const v = q.get('visao');
        this._visaoQuery = v === 'lista' || v === 'calendario' ? v : null;

        // Dia: o da query, se pertencer ao mês; senão hoje (quando estiver no mês) ou nenhum.
        const dia = q.get('dia');
        if (parseDataIso(dia) && mesDaData(dia) === this.mes) {
            this.dia = dia!.substring(0, 10);
            this._diaQuery = this.dia;
        } else {
            this._diaQuery = null;
            this.dia = mesDaData(this.hoje) === this.mes ? this.hoje : null;
        }
    }

    // Distribui os itens pelos dias da grade e monta os grupos da Lista (só os dias do mês com itens).
    private montar(): void {
        const porDia = new Map<string, ItemAgenda[]>();
        for (const i of this.itens) {
            const lista = porDia.get(i.data);
            if (lista) {
                lista.push(i);
            } else {
                porDia.set(i.data, [i]);
            }
        }

        this.celulas = gradeDoMes(this.mes).map(dia => {
            const itens = porDia.get(dia.data) ?? [];
            const nomeMes = nomeDoMes(mesDaData(dia.data), false).split(' ')[0];
            const qtd = itens.length === 0 ? 'sem eventos' : itens.length === 1 ? '1 evento' : `${itens.length} eventos`;
            return { dia, itens, rotulo: `${dia.numero} de ${nomeMes}, ${qtd}` };
        });

        this.grupos = this.celulas
            .filter(c => !c.dia.foraDoMes && c.itens.length > 0)
            .map(c => ({
                data: c.dia.data,
                titulo: `${this.diaSemanaMaiuscula(c.dia.data)}, ${formatarDiaMes(c.dia.data)}`,
                itens: c.itens,
            }));
    }

    // Na Lista, rola até o dia da query (?dia=, gravado pelo Fechar da ficha) ou, sem ele, até hoje (ou o próximo dia com eventos) no mês atual.
    private rolarParaDia(): void {
        if (!this._rolar || this.loading || this.visao !== 'lista') {
            return;
        }
        const referencia = this._diaQuery ?? (this.ehMesAtual ? hojeIso() : null);
        if (!referencia) {
            return;
        }
        const alvo = this.grupos.find(g => g.data >= referencia);
        if (!alvo) {
            return;
        }
        this._rolar = false;
        setTimeout(() => {
            const area = this._rolagem?.nativeElement;
            const secao = document.getElementById('dia-' + alvo.data);
            if (!area || !secao) {
                return;
            }
            area.scrollTop += secao.getBoundingClientRect().top - area.getBoundingClientRect().top;
        });
    }
}
