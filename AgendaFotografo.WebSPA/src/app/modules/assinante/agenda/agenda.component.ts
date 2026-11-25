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
import { Subject, catchError, forkJoin, map, of, switchMap, takeUntil, tap } from 'rxjs';
import { AgendaFiltro } from 'app/models/DTOs/filters/AgendaFiltro';
import { EscalaItem } from 'app/models/DTOs/responses/EscalaItem';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { STATUS_EVENTO, STATUS_EVENTO_COR, STATUS_EVENTO_PONTO, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { FiltroBotaoComponent } from 'app/modules/shared/components/filtro-painel/filtro-botao.component';
import { FiltroPainelComponent } from 'app/modules/shared/components/filtro-painel/filtro-painel.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { CustomSearchSelectComponent } from 'app/modules/shared/components/custom-select/custom-select.component';
import { OpcoesSelect } from 'app/utils/opcoes-select';
import { EscalaCoordenadorService } from 'app/services/escala-coordenador.service';
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

/**
 * Item desenhado na Agenda (plano 23): evento próprio ou evento de OUTRA equipe em que o coordenador foi escalado
 * (somente leitura, vindo de `EscalaCoordenador/Listar`). A junção é só visual e só no SPA; nada é gravado nem enviado à API.
 */
interface ItemProprio {
    origem: 'proprio';
    chave: string;
    data: string; // "yyyy-MM-dd"
    hora: string | null;
    evento: EventoListItem;
}

interface ItemEquipe {
    origem: 'equipe';
    chave: string;
    data: string;
    hora: string | null;
    escala: EscalaItem;
    /** "Evento da equipe de <Coordenador>": texto sempre visível, nunca só cor. */
    etiqueta: string;
}

type ItemAgenda = ItemProprio | ItemEquipe;

// Célula do calendário: o dia da grade e os itens dele.
interface Celula {
    dia: DiaDaGrade;
    itens: ItemAgenda[];
    rotulo: string; // aria-label: "14 de novembro, 3 eventos, 1 de outras equipes"
}

// Grupo da Lista: um dia do mês com itens.
interface GrupoDia {
    data: string;
    titulo: string; // "Sábado, 14/11"
    itens: ItemAgenda[];
}

// Igualdade de cidade sem diferenciar maiúsculas e acentos (o filtro de cidade também vale para os eventos de outras equipes).
function semAcento(t: string | null | undefined): string {
    return (t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

// Agenda: os eventos de um mês em duas visões (Lista e Calendário). O estado (mês, visão, filtros e dia) fica na query string
// (?mes=yyyy-MM&visao=lista|calendario&status=&tipoEventoId=&cidade=&membroId=&dia=yyyy-MM-dd). A API é chamada uma vez por
// mês/filtros, sempre com o intervalo da grade de 42 dias (segunda a domingo); trocar de visão ou de dia não chama a API.
// Plano 23: junto com os eventos próprios vem (`forkJoin`) a escala de OUTRAS equipes (`EscalaCoordenador/Listar`), só para desenhar.
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
    proprios: EventoListItem[] = [];
    equipeBruta: EscalaItem[] = []; // eventos de outras equipes, sem filtro de cidade (o filtro é aplicado em montar())
    equipeFalhou = false; // só a chamada de outras equipes falhou: os próprios aparecem e uma linha avisa
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
        private _escalaCoordenador: EscalaCoordenadorService,
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

    // Status, tipo e membro não existem nos eventos de outras equipes: com qualquer um ativo só os próprios aparecem.
    get filtraSoProprios(): boolean {
        return this.status !== null || !!this.tipoEventoId || !!this.membroId;
    }

    get itensDoDiaSelecionado(): ItemAgenda[] {
        return this.dia ? this.celulas.find(c => c.dia.data === this.dia)?.itens ?? [] : [];
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
            switchMap(() => {
                // Outras equipes: falha vira null (só uma linha avisa); com filtro de status/tipo/membro nem chama a API.
                const intervalo = intervaloDaGrade(this.mes);
                const equipe$ = this.filtraSoProprios
                    ? of([] as EscalaItem[] | null)
                    : this._escalaCoordenador.Listar(intervalo.dataDe, intervalo.dataAte).pipe(catchError(() => of(null as EscalaItem[] | null)));
                return forkJoin({ lista: this._service.Agenda(this.filtroApi()), equipe: equipe$ }).pipe(
                    map(r => ({ lista: r.lista as EventoListItem[] | null, equipe: r.equipe, erro: null as any })),
                    catchError(erro => of({ lista: null as EventoListItem[] | null, equipe: null as EscalaItem[] | null, erro })),
                );
            }),
            takeUntil(this._destroy$),
        ).subscribe(r => {
            this.loading = false;
            this.erroCarga = !!r.erro;
            this.equipeFalhou = !r.erro && r.equipe === null;
            if (r.erro) {
                this.proprios = [];
                this.equipeBruta = [];
                this._snackBar.open(mensagemErro(r.erro, 'Não foi possível carregar a agenda.'), 'X', { duration: 6000 });
            } else {
                this.proprios = r.lista ?? [];
                this.equipeBruta = r.equipe ?? [];
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

    // Evento de outra equipe: detalhe somente leitura (nunca a ficha de edição).
    abrirEscala(e: EscalaItem, event?: MouseEvent): void {
        event?.stopPropagation();
        abrirRota(this._router, this._route, ['/assinante/escalas', e.EventoId], event);
    }

    // Texto lido pelo leitor de tela nos itens de outras equipes (o item inteiro é um link).
    rotuloEscala(i: ItemEquipe): string {
        const e = i.escala;
        return [e.EVE_NOME, e.EVE_HORA ? formatarHora(e.EVE_HORA) : 'hora a confirmar', i.etiqueta, e.Cancelado ? 'cancelado' : null].filter(x => !!x).join(', ');
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
    trackItem = (_: number, i: ItemAgenda) => i.chave;

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

    // Junta próprios e outras equipes (só visual), aplica a cidade às outras equipes, ordena por hora ("a confirmar" por último,
    // próprios antes em empate; a ordem da API é mantida entre iguais), distribui pelos dias da grade e monta os grupos da Lista.
    private montar(): void {
        const cidade = semAcento(this.cidade);
        const itens: ItemAgenda[] = [
            ...this.proprios.map((e): ItemAgenda => ({
                origem: 'proprio', chave: `p:${e.Id}`, data: (e.EVE_DATA ?? '').substring(0, 10), hora: e.EVE_HORA ?? null, evento: e,
            })),
            ...this.equipeBruta
                .filter(e => !cidade || semAcento(e.EVE_CIDADE) === cidade)
                .map((e): ItemAgenda => ({
                    origem: 'equipe', chave: `e:${e.EventoId}`, data: (e.EVE_DATA ?? '').substring(0, 10), hora: e.EVE_HORA ?? null,
                    escala: e, etiqueta: `Evento da equipe de ${e.CoordenadorNome}`,
                })),
        ];

        const porDia = new Map<string, ItemAgenda[]>();
        for (const i of itens) {
            const lista = porDia.get(i.data);
            if (lista) {
                lista.push(i);
            } else {
                porDia.set(i.data, [i]);
            }
        }
        const rank = (i: ItemAgenda) => (i.origem === 'proprio' ? 0 : 1);
        for (const lista of porDia.values()) {
            lista.sort((a, b) => (a.hora ?? '99:99:99').localeCompare(b.hora ?? '99:99:99') || rank(a) - rank(b));
        }

        this.celulas = gradeDoMes(this.mes).map(dia => {
            const lista = porDia.get(dia.data) ?? [];
            const nomeMes = nomeDoMes(mesDaData(dia.data), false).split(' ')[0];
            const fora = lista.filter(i => i.origem === 'equipe').length;
            const qtd = lista.length === 0 ? 'sem eventos' : lista.length === 1 ? '1 evento' : `${lista.length} eventos`;
            const nota = fora === 0 ? '' : fora === 1 ? ', 1 de outra equipe' : `, ${fora} de outras equipes`;
            return { dia, itens: lista, rotulo: `${dia.numero} de ${nomeMes}, ${qtd}${nota}` };
        });

        this.grupos = this.celulas
            .filter(c => !c.dia.foraDoMes && c.itens.length > 0)
            .map(c => ({
                data: c.dia.data,
                titulo: `${this.diaSemanaMaiuscula(c.dia.data)}, ${formatarDiaMes(c.dia.data)}`,
                itens: c.itens,
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
