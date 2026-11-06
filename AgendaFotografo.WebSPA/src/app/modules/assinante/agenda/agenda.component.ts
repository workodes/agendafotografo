import { ProgressoPendenciasComponent } from 'app/modules/shared/components/progresso-pendencias/progresso-pendencias.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { Subject, catchError, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { AgendaFiltro } from 'app/models/DTOs/filters/AgendaFiltro';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { STATUS_EVENTO, STATUS_EVENTO_COR, STATUS_EVENTO_PONTO, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import { EventoService } from 'app/services/evento.service';
import {
    CABECALHO_SEMANA, DiaDaGrade, gradeDoMes, intervaloDaGrade, mesAnterior, mesAtual, mesDaData, mesSeguinte, mesValido, nomeDoMes,
} from 'app/utils/calendario';
import { localCidade } from 'app/utils/local-evento';
import { diaSemana, formatarData, formatarDiaMes, formatarHora, hojeIso, parseDataIso } from 'app/utils/data-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';
import { LinkPublicoCompartilharService } from '../eventos/link-publico-compartilhar/link-publico-compartilhar.service';

type Visao = 'lista' | 'calendario';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Célula do calendário: o dia da grade e os eventos dele.
interface Celula {
    dia: DiaDaGrade;
    eventos: EventoListItem[];
    rotulo: string; // aria-label: "14 de novembro, 3 eventos"
}

// Grupo da Lista: um dia do mês com eventos.
interface GrupoDia {
    data: string;
    titulo: string; // "Sábado, 14/11"
    eventos: EventoListItem[];
}

// Agenda: os eventos de um mês em duas visões (Lista e Calendário). O estado (mês, visão, filtros e dia) fica na query string
// (?mes=yyyy-MM&visao=lista|calendario&status=&tipoEventoId=&cidade=&membroId=&dia=yyyy-MM-dd). A API é chamada uma vez por
// mês/filtros, sempre com o intervalo da grade de 42 dias (segunda a domingo); trocar de visão ou de dia não chama a API.
@Component({
    standalone: true,
    selector: 'agenda',
    templateUrl: './agenda.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [
        CommonModule, RouterModule, ReactiveFormsModule,
        MatButtonModule, MatButtonToggleModule, MatFormFieldModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule,
        FiltroBotaoComponent, FiltroPainelComponent, FecharComEscDirective, CustomSearchSelectComponent, ProgressoPendenciasComponent,
    ],
})
export class AgendaComponent implements OnInit, OnDestroy {
    // ---- Estado vindo da query string ----
    mes = mesAtual();
    dia: string | null = null;
    status: number | null = null;
    tipoEventoId: string | null = null;
    cidade: string | null = null;
    membroId: string | null = null;

    // ---- Dados ----
    eventos: EventoListItem[] = [];
    celulas: Celula[] = [];
    grupos: GrupoDia[] = [];
    loading = false;
    erroCarga = false;

    // ---- Opções dos filtros ----
    tipos: Opcao[] = [];
    membros: Opcao[] = [];
    cidades: string[] = [];
    cidadesCombo: string[] = [];
    private _tiposSel = new OpcoesSelect<Opcao>(t => t.Id, t => t.Nome);
    private _membrosSel = new OpcoesSelect<Opcao>(m => m.Id, m => m.Nome);
    private _cidadesSel = new OpcoesSelect<string>(c => c, c => c);
    get tiposOpcoes() { return this._tiposSel.de(this.tipos); }
    get membrosOpcoes() { return this._membrosSel.de(this.membros); }
    get cidadesOpcoes() { return this._cidadesSel.de(this.cidadesCombo); }
    statusLista = STATUS_EVENTO;

    // Rascunho do painel de filtros (só vale depois de "Aplicar").
    filtroAberto = false;
    fStatus = new FormControl<number | null>(null);
    fTipo = new FormControl<string | null>(null);
    fCidade = new FormControl<string | null>(null);
    fMembro = new FormControl<string | null>(null);

    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;
    statusPonto = STATUS_EVENTO_PONTO;
    cancelado = StatusEvento.Cancelado;
    cabecalho = CABECALHO_SEMANA;
    formatarHora = formatarHora;
    localCidade = localCidade;
    hoje = hojeIso();

    private _visaoQuery: Visao | null = null;
    private _ehMd = false;
    private _chave = '';
    private _visaoAtual: Visao | null = null;
    private _rolar = false;
    private _diaQuery: string | null = null; // ?dia= válido da query (sem o dia padrão "hoje")
    @ViewChild('rolagem') private _rolagem?: ElementRef<HTMLElement>;
    private _carga$ = new Subject<void>();
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _cdr: ChangeDetectorRef,
        private _title: Title,
        private _breakpoint: BreakpointObserver,
        private _linkPublico: LinkPublicoCompartilharService,
    ) { }

    // ---- Derivados ----

    // Visão da query; sem ?visao= vale Lista no celular e Calendário a partir de md.
    get visao(): Visao {
        return this._visaoQuery ?? (this._ehMd ? 'calendario' : 'lista');
    }

    get nomeMes(): string {
        return nomeDoMes(this.mes);
    }

    get ehMesAtual(): boolean {
        return this.mes === mesAtual();
    }

    get filtrosAtivos(): boolean {
        return this.status !== null || !!this.tipoEventoId || !!this.cidade || !!this.membroId;
    }

    get mensagemVazia(): string {
        return `Nenhum evento em ${nomeDoMes(this.mes, false)}${this.filtrosAtivos ? ' com estes filtros' : ''}`;
    }

    get eventosDoDiaSelecionado(): EventoListItem[] {
        return this.dia ? this.celulas.find(c => c.dia.data === this.dia)?.eventos ?? [] : [];
    }

    get tituloDia(): string {
        return this.dia ? `${this.diaSemanaMaiuscula(this.dia)}, ${formatarData(this.dia)}` : '';
    }

    ngOnInit(): void {
        this._title.setTitle('Agenda');

        const d = this._route.snapshot.data['data'];
        this.tipos = d?.tipos ?? [];
        this.membros = d?.membros ?? [];
        this.cidades = d?.cidades ?? [];

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
            switchMap(() => this._service.Agenda(this.filtroApi()).pipe(
                map(lista => ({ lista, erro: null as any })),
                catchError(erro => of({ lista: null as EventoListItem[] | null, erro })),
            )),
            takeUntil(this._destroy$),
        ).subscribe(r => {
            this.loading = false;
            this.erroCarga = !!r.erro;
            if (r.erro) {
                this.eventos = [];
                this._snackBar.open(mensagemErro(r.erro, 'Não foi possível carregar a agenda.'), 'X', { duration: 6000 });
            } else {
                this.eventos = r.lista ?? [];
            }
            this.montar();
            this.rolarParaDia();
            this._cdr.markForCheck();
        });

        // A query string é a fonte do estado; mudou o mês ou algum filtro = nova carga.
        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            const visaoAntes = this._visaoAtual;
            const mesAntes = this.mes;
            this.lerQuery(q);
            this._visaoAtual = this.visao;
            const chave = [this.mes, this.status, this.tipoEventoId, this.cidade, this.membroId].join('|');
            if (chave !== this._chave) {
                this._chave = chave;
                this._rolar = this.visao === 'lista';
                if (this.mes !== mesAntes && this._rolagem) {
                    this._rolagem.nativeElement.scrollTop = 0; // mês novo começa no topo
                }
                this.montar(); // já mostra a grade do mês novo enquanto a API responde
                this._carga$.next();
            } else {
                this.montar();
                if (this.visao === 'lista' && visaoAntes !== 'lista') {
                    this._rolar = true; // voltou para a Lista: rola até o dia da query (ou hoje) de novo
                    this.rolarParaDia();
                }
            }
            this.restaurarFiltros();
            this.atualizarCidadesCombo();
            this._cdr.markForCheck();
        });

        // Evento criado/alterado/excluído ou escala mudou: recarrega os eventos e as cidades.
        this._service.alterado$.pipe(takeUntil(this._destroy$)).subscribe(() => {
            this._carga$.next();
            this._service.Cidades().subscribe({
                next: c => {
                    this.cidades = c;
                    this.atualizarCidadesCombo();
                    this._cdr.markForCheck();
                },
                error: () => { /* mantém a lista de cidades anterior */ },
            });
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    // ---- Navegação (escreve a query string) ----

    private navegar(params: Record<string, string | number | null>, replaceUrl = false): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: params, queryParamsHandling: 'merge', replaceUrl });
    }

    mesAnterior(): void {
        this.navegar({ mes: mesAnterior(this.mes), dia: null });
    }

    mesSeguinte(): void {
        this.navegar({ mes: mesSeguinte(this.mes), dia: null });
    }

    tentarDeNovo(): void {
        this._carga$.next();
    }

    irParaHoje(): void {
        this.navegar({ mes: mesAtual(), dia: null });
    }

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

    abrirEvento(e: EventoListItem, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/assinante/eventos', e.Id], event);
    }

    // Botão de link do item: abre o fluxo do link público sem abrir a ficha.
    copiarLink(e: EventoListItem, event: Event): void {
        event.stopPropagation();
        this._linkPublico.Abrir({ id: e.Id, nome: e.EVE_NOME, data: e.EVE_DATA });
    }

    novoEvento(): void {
        this._router.navigate(['/assinante/eventos/novo'], { queryParams: this.dia ? { data: this.dia } : {} });
    }

    // ---- Filtros ----

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
            status: this.fStatus.value ?? null,
            tipoEventoId: this.fTipo.value || null,
            cidade: this.fCidade.value || null,
            membroId: this.fMembro.value || null,
        });
    }

    // Remove os 4 filtros e mantém mês e visão.
    limparFiltros(): void {
        this.filtroAberto = false;
        this.navegar({ status: null, tipoEventoId: null, cidade: null, membroId: null });
    }

    private restaurarFiltros(): void {
        this.fStatus.setValue(this.status);
        this.fTipo.setValue(this.tipoEventoId);
        this.fCidade.setValue(this.cidade);
        this.fMembro.setValue(this.membroId);
    }

    // Uma cidade da query que deixou de existir continua filtrando e aparece no combo.
    private atualizarCidadesCombo(): void {
        const lista = [...this.cidades];
        if (this.cidade && !lista.some(c => c.toLowerCase() === this.cidade!.toLowerCase())) {
            lista.push(this.cidade);
            lista.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        }
        this.cidadesCombo = lista;
    }

    // ---- Apresentação ----

    // "@instagram" (ou o nome, sem Instagram) de cada escalado.
    equipe(e: EventoListItem): string {
        return (e.Equipe ?? []).map(m => (m.MEM_INSTAGRAM ? '@' + m.MEM_INSTAGRAM : m.MEM_NOME)).join(', ');
    }

    rotuloStatus(s: number): string {
        return this.statusRotulo[s] ?? '';
    }

    trackCelula = (_: number, c: Celula) => c.dia.data;
    trackGrupo = (_: number, g: GrupoDia) => g.data;
    trackEvento = (_: number, e: EventoListItem) => e.Id;

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

        const status = Number(q.get('status'));
        this.status = Number.isInteger(status) && status >= 1 && status <= 4 ? status : null;
        this.tipoEventoId = GUID.test(q.get('tipoEventoId') ?? '') ? q.get('tipoEventoId') : null;
        this.membroId = GUID.test(q.get('membroId') ?? '') ? q.get('membroId') : null;
        this.cidade = (q.get('cidade') ?? '').trim() || null;

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

    private filtroApi(): AgendaFiltro {
        return {
            ...intervaloDaGrade(this.mes),
            status: this.status,
            tipoEventoId: this.tipoEventoId,
            cidade: this.cidade,
            membroId: this.membroId,
        };
    }

    // Distribui os eventos pelos dias da grade e monta os grupos da Lista (só os dias do mês com eventos).
    private montar(): void {
        const porDia = new Map<string, EventoListItem[]>();
        for (const e of this.eventos) {
            const data = (e.EVE_DATA ?? '').substring(0, 10);
            const lista = porDia.get(data);
            if (lista) {
                lista.push(e);
            } else {
                porDia.set(data, [e]);
            }
        }

        this.celulas = gradeDoMes(this.mes).map(dia => {
            const eventos = porDia.get(dia.data) ?? [];
            const nomeMes = nomeDoMes(mesDaData(dia.data), false).split(' ')[0];
            const qtd = eventos.length === 0 ? 'sem eventos' : eventos.length === 1 ? '1 evento' : `${eventos.length} eventos`;
            return { dia, eventos, rotulo: `${dia.numero} de ${nomeMes}, ${qtd}` };
        });

        this.grupos = this.celulas
            .filter(c => !c.dia.foraDoMes && c.eventos.length > 0)
            .map(c => ({
                data: c.dia.data,
                titulo: `${this.diaSemanaMaiuscula(c.dia.data)}, ${formatarDiaMes(c.dia.data)}`,
                eventos: c.eventos,
            }));
    }

    // Na Lista, rola até o dia da query (?dia=, o que o Fechar da ficha grava) ou, sem ele, até hoje (ou o próximo dia
    // com eventos) quando o mês é o atual.
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
        // Rola só a área da lista: scrollIntoView rolaria também os contêineres de fora (mesmo com overflow-hidden)
        // e o cabeçalho da Agenda (Lista/Calendário, Novo evento) sumiria da tela.
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
