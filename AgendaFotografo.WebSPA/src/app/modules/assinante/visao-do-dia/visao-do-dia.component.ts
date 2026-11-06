import { ProgressoPendenciasComponent } from 'app/modules/shared/components/progresso-pendencias/progresso-pendencias.component';
import { CdkDrag, CdkDragDrop, CdkDragPlaceholder, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { DiaEquipeItem, DiaEventoItem, DiaResponse } from 'app/models/DTOs/responses/DiaResponse';
import { MembroListItem } from 'app/models/DTOs/responses/MembroListItem';
import { FUNCAO_MEMBRO, FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { STATUS_EVENTO_COR, STATUS_EVENTO_PONTO, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { EventoService } from 'app/services/evento.service';
import { MembroService } from 'app/services/membro.service';
import { localCidade } from 'app/utils/local-evento';
import { diaSemana, diaSemanaCurto, formatarData, formatarDataIso, formatarDiaMes, formatarHora, hojeIso, parseDataIso, somarDiasIso } from 'app/utils/data-evento';
import { abrirRota } from 'app/utils/navegar';
import { LinkPublicoCompartilharService } from '../eventos/link-publico-compartilhar/link-publico-compartilhar.service';

type Visao = 'semana' | 'dia';

/** Alvo de soltura: o evento e o dia em que ele está. */
interface AlvoEscala {
    evento: DiaEventoItem;
    data: string;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/**
 * Visão da semana (padrão) e do dia. Query: `?visao=semana|dia&data=yyyy-MM-dd` (semana de segunda a domingo que contém a data).
 * A semana são 7 chamadas de `Evento/Dia` em paralelo (sem endpoint novo). Painel da equipe: arrastar um membro até o card do evento
 * escala (`Evento/AdicionarMembro`, sem posição); no celular, tocar no membro e depois no evento. Conflito no mesmo dia só avisa,
 * como no resto do sistema (nunca bloqueia). O X na equipe do card remove, com "Desfazer".
 */
@Component({
    standalone: true,
    selector: 'visao-do-dia',
    templateUrl: './visao-do-dia.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    styles: [`
        .alvo-escala.cdk-drop-list-dragging { outline: 2px dashed var(--fuse-primary-500, #f97316); outline-offset: 2px; background-color: rgba(249, 115, 22, .06); }
        .cdk-drag-preview { box-shadow: 0 6px 18px rgba(0,0,0,.18); border-radius: 9999px; }
        .cdk-drag-animating { transition: transform 200ms cubic-bezier(0, 0, .2, 1); }
    `],
    imports: [
        CommonModule, RouterModule, FormsModule, MatButtonModule, MatButtonToggleModule, MatDatepickerModule, MatIconModule, MatInputModule,
        MatProgressBarModule, MatTooltipModule, ProgressoPendenciasComponent, CdkDropListGroup, CdkDropList, CdkDrag, CdkDragPlaceholder, CdkScrollable,
    ],
})
export class VisaoDoDiaComponent implements OnInit, OnDestroy {
    visao: Visao = 'semana';
    data = hojeIso();
    dias: DiaResponse[] = [];
    membros: MembroListItem[] = [];
    busca = '';
    carregando = false;
    /** Membro escolhido por toque (celular): o próximo toque num evento escala. */
    selecionado: MembroListItem | null = null;
    /** Evento recebendo uma escala/remoção agora (evita clique duplo). */
    ocupado = new Set<string>();

    funcoes = FUNCAO_MEMBRO;
    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;
    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;
    statusPonto = STATUS_EVENTO_PONTO;
    cancelado = StatusEvento.Cancelado;
    formatarHora = formatarHora;
    localCidade = localCidade;
    diaSemanaCurto = diaSemanaCurto;
    formatarDiaMes = formatarDiaMes;
    /** Ninguém solta de volta no painel. */
    nunca = () => false;
    /** Atraso para iniciar o arrasto no toque, para a faixa do celular continuar rolando. */
    atrasoArrasto = { touch: 300, mouse: 0 };

    private _destroy$ = new Subject<void>();
    private _carga$ = new Subject<void>();
    /** Fim do último arrasto: o clique que o navegador solta logo depois não deve virar "escolher por toque". */
    private _ultimoArrasto = 0;

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _title: Title,
        private _service: EventoService,
        private _membroService: MembroService,
        private _snackBar: MatSnackBar,
        private _linkPublico: LinkPublicoCompartilharService,
    ) { }

    // ---- Datas ----

    get hoje(): string { return hojeIso(); }

    /** Segunda-feira da semana da data. */
    get inicioSemana(): string {
        const d = parseDataIso(this.data) ?? new Date();
        const desloc = (d.getDay() + 6) % 7; // segunda = 0
        return somarDiasIso(this.data, -desloc);
    }

    get dataDate(): Date | null { return parseDataIso(this.data); }

    /** Número do dia ("9"). */
    diaDoMes(iso: string): number { return parseDataIso(iso)?.getDate() ?? 0; }

    get titulo(): string {
        if (this.visao === 'dia') {
            const s = diaSemana(this.data);
            return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}, ${formatarData(this.data)}` : '';
        }
        const ini = parseDataIso(this.inicioSemana);
        const fim = parseDataIso(somarDiasIso(this.inicioSemana, 6));
        if (!ini || !fim) return '';
        const mesIni = MESES[ini.getMonth()];
        const mesFim = MESES[fim.getMonth()];
        return mesIni === mesFim
            ? `${ini.getDate()} a ${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`
            : `${ini.getDate()} de ${mesIni} a ${fim.getDate()} de ${mesFim} de ${fim.getFullYear()}`;
    }

    get noPeriodoAtual(): boolean {
        return this.visao === 'dia' ? this.data === hojeIso() : this.dias.some(d => d.Data === hojeIso());
    }

    get dia(): DiaResponse | undefined { return this.visao === 'dia' ? this.dias[0] : undefined; }

    get totalEventos(): number { return this.dias.reduce((t, d) => t + d.Eventos.length, 0); }

    // ---- Ciclo ----

    ngOnInit(): void {
        this._title.setTitle('Visão da semana');

        this._carga$.pipe(
            tap(() => this.carregando = true),
            switchMap(() => {
                const datas = this.visao === 'dia' ? [this.data] : Array.from({ length: 7 }, (_, i) => somarDiasIso(this.inicioSemana, i));
                // Erro fica dentro do switchMap: a próxima navegação continua carregando
                return forkJoin(datas.map(d => this._service.Dia(d))).pipe(
                    catchError(e => { this.aviso(this.erro(e, 'Não foi possível carregar a agenda.')); return of(null); }),
                );
            }),
            takeUntil(this._destroy$),
        ).subscribe(dias => {
            this.carregando = false;
            if (dias) this.dias = dias;
        });

        this._route.queryParamMap.pipe(takeUntil(this._destroy$)).subscribe(q => {
            const data = q.get('data');
            this.data = parseDataIso(data) ? data! : hojeIso();
            this.visao = q.get('visao') === 'dia' ? 'dia' : 'semana';
            this._title.setTitle(this.visao === 'dia' ? 'Visão do dia' : 'Visão da semana');
            this._carga$.next();
        });

        this._membroService.GetAllPaginated(1, 100, '', 'true').pipe(takeUntil(this._destroy$))
            .subscribe({ next: r => this.membros = r.Data ?? [], error: () => this.membros = [] });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    // ---- Navegação ----

    irPara(data: string, visao: Visao = this.visao): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: { data, visao }, queryParamsHandling: 'merge' });
    }

    trocarVisao(v: Visao): void { this.irPara(this.data, v); }

    anterior(): void { this.irPara(somarDiasIso(this.data, this.visao === 'dia' ? -1 : -7)); }

    proximo(): void { this.irPara(somarDiasIso(this.data, this.visao === 'dia' ? 1 : 7)); }

    irHoje(): void { this.irPara(hojeIso()); }

    aoEscolherData(d: Date | null): void {
        if (d) this.irPara(formatarDataIso(d));
    }

    abrirDia(data: string): void { this.irPara(data, 'dia'); }

    novoEvento(data: string = this.data, event?: Event): void {
        event?.stopPropagation();
        this._router.navigate(['/assinante/eventos/novo'], { queryParams: { data } });
    }

    /** Clique no card: com um membro escolhido por toque, escala; senão abre a ficha. */
    aoClicarEvento(e: DiaEventoItem, data: string, event?: MouseEvent): void {
        if (this.selecionado) {
            event?.preventDefault();
            if (e.EVE_STATUS === StatusEvento.Cancelado) {
                this.aviso('Este evento está cancelado. Escolha outro evento.');
                return;
            }
            this.escalar(this.selecionado, { evento: e, data });
            this.selecionado = null;
            return;
        }
        abrirRota(this._router, this._route, ['/assinante/eventos', e.Id], event);
    }

    copiarLink(e: DiaEventoItem, data: string, event: Event): void {
        event.stopPropagation();
        this._linkPublico.Abrir({ id: e.Id, nome: e.EVE_NOME, data });
    }

    // ---- Painel da equipe ----

    get membrosFiltrados(): MembroListItem[] {
        const t = this.busca.trim().toLowerCase();
        return t ? this.membros.filter(m => m.MEM_NOME.toLowerCase().includes(t) || (m.MEM_INSTAGRAM ?? '').toLowerCase().includes(t)) : this.membros;
    }

    /** Livres do dia (visão Dia), vindos da API, por função. */
    livresDaFuncao(funcao: number) {
        return (this.dia?.Livres ?? []).filter(l => l.MEM_FUNCAO === funcao);
    }

    membrosDaFuncao(funcao: number): MembroListItem[] {
        return this.membrosFiltrados.filter(m => m.MEM_FUNCAO === funcao);
    }

    /** Quantos eventos (não cancelados) do período já têm o membro. */
    eventosDoMembro(membroId: string): number {
        let n = 0;
        for (const d of this.dias) {
            for (const e of d.Eventos) {
                if (e.EVE_STATUS !== StatusEvento.Cancelado && e.Equipe.some(m => m.EVM_MEMBRO_ID === membroId)) n++;
            }
        }
        return n;
    }

    rotuloOcupacao(membroId: string): string {
        const n = this.eventosDoMembro(membroId);
        if (this.visao === 'dia') return n === 0 ? 'Livre neste dia' : n === 1 ? 'Em 1 evento neste dia' : `Em ${n} eventos neste dia`;
        return n === 0 ? 'Nenhum evento na semana' : n === 1 ? '1 evento na semana' : `${n} eventos na semana`;
    }

    alternarSelecao(m: MembroListItem): void {
        if (Date.now() - this._ultimoArrasto < 400) return;
        this.selecionado = this.selecionado?.Id === m.Id ? null : m;
    }

    iniciais(nome: string): string {
        const p = (nome ?? '').trim().split(/\s+/).filter(x => !!x);
        return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
    }

    primeiroNome(nome: string): string {
        return (nome ?? '').trim().split(/\s+/)[0] ?? '';
    }

    // ---- Escala ----

    aoSoltar(ev: CdkDragDrop<AlvoEscala | null, any, MembroListItem>): void {
        const alvo = ev.container.data;
        // Soltou fora de qualquer evento (o CDK entrega ao último evento sobrevoado): não escala
        if (!alvo || ev.previousContainer === ev.container || !ev.isPointerOverContainer) return;
        this.escalar(ev.item.data, alvo);
    }

    fimArrasto(): void {
        this._ultimoArrasto = Date.now();
    }

    escalar(m: MembroListItem, alvo: AlvoEscala): void {
        const e = alvo.evento;
        if (e.Equipe.some(x => x.EVM_MEMBRO_ID === m.Id)) {
            this.aviso(`${m.MEM_NOME} já está escalado em ${e.EVE_NOME}.`);
            return;
        }
        if (this.ocupado.has(e.Id)) return;

        const outros = this.dias.find(d => d.Data === alvo.data)?.Eventos
            .filter(o => o.Id !== e.Id && o.EVE_STATUS !== StatusEvento.Cancelado && o.Equipe.some(x => x.EVM_MEMBRO_ID === m.Id))
            .map(o => o.EVE_NOME) ?? [];

        this.ocupado.add(e.Id);
        this._service.AdicionarMembro({ EVM_EVENTO_ID: e.Id, EVM_MEMBRO_ID: m.Id, EVM_POSICAO: null }).subscribe({
            next: () => {
                this.ocupado.delete(e.Id);
                this._service.NotificarAlteracao();
                this.recarregarDia(alvo.data);
                const msg = outros.length
                    ? `${m.MEM_NOME} escalado em ${e.EVE_NOME}. Atenção: também está em ${outros.join(', ')} neste dia.`
                    : `${m.MEM_NOME} escalado em ${e.EVE_NOME}.`;
                this.aviso(msg, outros.length ? 7000 : 3000);
            },
            error: err => {
                this.ocupado.delete(e.Id);
                this.aviso(this.erro(err, 'Não foi possível escalar.'));
            },
        });
    }

    remover(m: DiaEquipeItem, e: DiaEventoItem, data: string, event: Event): void {
        event.stopPropagation();
        if (this.ocupado.has(e.Id)) return;
        this.ocupado.add(e.Id);
        this._service.RemoverMembro(m.Id).subscribe({
            next: () => {
                this.ocupado.delete(e.Id);
                this._service.NotificarAlteracao();
                this.recarregarDia(data);
                const ref = this._snackBar.open(`${m.MEM_NOME} saiu de ${e.EVE_NOME}.`, 'Desfazer', { duration: 6000 });
                ref.onAction().subscribe(() => {
                    this._service.AdicionarMembro({ EVM_EVENTO_ID: e.Id, EVM_MEMBRO_ID: m.EVM_MEMBRO_ID, EVM_POSICAO: m.EVM_POSICAO ?? null }).subscribe({
                        next: () => { this._service.NotificarAlteracao(); this.recarregarDia(data); },
                        error: err => this.aviso(this.erro(err, 'Não foi possível desfazer.')),
                    });
                });
            },
            error: err => {
                this.ocupado.delete(e.Id);
                this.aviso(this.erro(err, 'Não foi possível remover.'));
            },
        });
    }

    private recarregarDia(data: string): void {
        this._service.Dia(data).subscribe({
            next: novo => {
                const i = this.dias.findIndex(d => d.Data === data);
                if (i >= 0) this.dias = this.dias.map((d, j) => j === i ? novo : d);
            },
        });
    }

    trackDia = (_: number, d: DiaResponse) => d.Data;
    trackEvento = (_: number, e: DiaEventoItem) => e.Id;
    trackMembro = (_: number, m: { Id: string }) => m.Id;

    private aviso(msg: string, duracao = 3000): void {
        this._snackBar.open(msg, 'OK', { duration: duracao });
    }

    private erro(e: any, padrao: string): string {
        return typeof e?.error === 'string' && e.error.trim() ? e.error : padrao;
    }
}
