import { NgClass, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { UsuarioService } from 'app/core/services/usuario.service';
import { DashboardDistribuicao, DashboardResumo } from 'app/models/DTOs/responses/DashboardResumo';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { DashboardService } from 'app/services/dashboard.service';
import { EventoService } from 'app/services/evento.service';
import { diaSemana, formatarData, formatarDataComDiaSemana, formatarDiaMes, formatarHora, hojeIso, somarDiasIso } from 'app/utils/data-evento';
import { debounceTime, Subscription } from 'rxjs';
import { InicioGraficoStatusComponent } from './inicio-grafico-status/inicio-grafico-status.component';
import { InicioGraficoTiposComponent } from './inicio-grafico-tipos/inicio-grafico-tipos.component';

type Estado = 'carregando' | 'pronto' | 'erro';

interface DiaDoInicio {
    data: string;
    titulo: string; // "Sáb 14/11"
    selo: string | null; // "Hoje" | "Amanhã"
    eventos: EventoListItem[];
}

interface BarraLista {
    chave: string;
    nome: string;
    quantidade: number;
    largura: number; // % da maior barra
    destino: { rota: string; query: Record<string, string> } | null;
}

// Início do assinante (plano 17): cartões, próximos 7 dias, números do mês, equipe e distribuições.
// Usa só Evento/Agenda (7 dias) e Dashboard/Resumo, em paralelo; cada bloco tem seu carregando, erro e vazio. Sem pendências nem avisos.
@Component({
    selector: 'app-inicio-assinante',
    standalone: true,
    imports: [NgClass, NgFor, NgIf, NgTemplateOutlet, RouterLink, MatButtonModule, MatIconModule, InicioGraficoStatusComponent, InicioGraficoTiposComponent],
    templateUrl: './inicio-assinante.component.html',
})
export class InicioAssinanteComponent implements OnInit {
    readonly STATUS_ROTULO = STATUS_EVENTO_ROTULO;
    readonly STATUS_COR = STATUS_EVENTO_COR;
    readonly FUNCAO_ROTULO = FUNCAO_MEMBRO_ROTULO;
    readonly formatarHora = formatarHora;
    readonly formatarDiaMes = formatarDiaMes;
    readonly Cancelado = StatusEvento.Cancelado;
    readonly esqueleto = [1, 2, 3];

    estadoAgenda: Estado = 'carregando';
    estadoResumo: Estado = 'carregando';
    nome = '';
    saudacao = '';
    dataExtenso = '';

    hoje = '';
    amanha = '';
    hojeQtd = 0;
    amanhaQtd = 0;
    dias: DiaDoInicio[] = [];

    resumo: DashboardResumo | null = null;
    mesIso = '';
    totalMes = 0;
    diferenca = 0;
    dadosStatus: { mes: DashboardResumo['Mes']; anterior: DashboardResumo['MesAnterior']; mesIso: string } | null = null;
    dadosTipos: { distribuicao: DashboardDistribuicao; mesIso: string } | null = null;
    maisEscalados: (BarraLista & { funcao: number; ativo: boolean })[] = [];
    aba: 'cidade' | 'organizador' = 'cidade';
    cidades: BarraLista[] = [];
    organizadores: BarraLista[] = [];

    private _subAgenda?: Subscription;
    private _subResumo?: Subscription;

    constructor(
        private _eventoService: EventoService,
        private _dashboardService: DashboardService,
        private _usuarioService: UsuarioService,
        private _cdr: ChangeDetectorRef,
        private _destroyRef: DestroyRef,
        titleService: Title,
    ) {
        titleService.setTitle('Início');
    }

    ngOnInit(): void {
        this._usuarioService.usuario$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(u => {
            this.nome = u?.FullName?.split(' ')[0] ?? '';
            this._cdr.markForCheck();
        });
        // Toda mudança de evento, escala ou cadastro recarrega o painel (debounce de 300 ms), sem voltar ao esqueleto.
        this._eventoService.alterado$.pipe(debounceTime(300), takeUntilDestroyed(this._destroyRef)).subscribe(() => {
            this.carregarAgenda(true);
            this.carregarResumo(true);
        });
        this.carregarTudo();
    }

    carregarTudo(): void {
        this.hoje = hojeIso();
        this.amanha = somarDiasIso(this.hoje, 1);
        const hora = new Date().getHours();
        this.saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
        const ds = diaSemana(this.hoje);
        this.dataExtenso = `${ds.charAt(0).toUpperCase()}${ds.slice(1)}, ${formatarData(this.hoje)}`;
        this.carregarAgenda(false);
        this.carregarResumo(false);
    }

    carregarAgenda(silencioso: boolean): void {
        this._subAgenda?.unsubscribe();
        if (!silencioso || this.estadoAgenda !== 'pronto') {
            this.estadoAgenda = 'carregando';
        }
        this.hoje = hojeIso();
        this.amanha = somarDiasIso(this.hoje, 1);
        this._subAgenda = this._eventoService.Agenda({ dataDe: this.hoje, dataAte: somarDiasIso(this.hoje, 7) }).subscribe({
            next: eventos => {
                this.montarDias(eventos ?? []);
                this.estadoAgenda = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                if (!silencioso || this.estadoAgenda !== 'pronto') {
                    this.estadoAgenda = 'erro';
                }
                this._cdr.markForCheck();
            },
        });
    }

    carregarResumo(silencioso: boolean): void {
        this._subResumo?.unsubscribe();
        if (!silencioso || this.estadoResumo !== 'pronto') {
            this.estadoResumo = 'carregando';
        }
        this._subResumo = this._dashboardService.Resumo().subscribe({
            next: r => {
                this.montarResumo(r);
                this.estadoResumo = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                if (!silencioso || this.estadoResumo !== 'pronto') {
                    this.estadoResumo = 'erro';
                }
                this._cdr.markForCheck();
            },
        });
    }

    escolherAba(aba: 'cidade' | 'organizador'): void {
        this.aba = aba;
    }

    /** Eventos Pendente/Confirmado sem ninguém escalado ganham o chip "Sem equipe" (mesma regra do cartão, só para os próximos 7 dias). */
    semEquipe(evento: EventoListItem): boolean {
        return (evento.EVE_STATUS === StatusEvento.Pendente || evento.EVE_STATUS === StatusEvento.Confirmado) && !(evento.Equipe?.length);
    }

    textoComparacao(): string {
        if (this.diferenca === 0) {
            return 'igual ao mês anterior';
        }
        const n = Math.abs(this.diferenca);
        return `${n} ${this.diferenca > 0 ? 'a mais' : 'a menos'} que no mês anterior`;
    }

    trackByData(_: number, dia: DiaDoInicio): string {
        return dia.data;
    }

    trackById(_: number, item: { Id: string }): string {
        return item.Id;
    }

    trackByChave(_: number, barra: BarraLista): string {
        return barra.chave;
    }

    private montarResumo(r: DashboardResumo): void {
        this.resumo = r;
        this.mesIso = (r.MesDe ?? '').substring(0, 7);
        this.totalMes = r.Mes.NaoCancelados;
        this.diferenca = r.Mes.NaoCancelados - r.MesAnterior.NaoCancelados;
        this.dadosStatus = { mes: r.Mes, anterior: r.MesAnterior, mesIso: this.mesIso };
        this.dadosTipos = { distribuicao: r.PorTipo, mesIso: this.mesIso };

        const maxEsc = Math.max(1, ...r.MaisEscalados.map(m => m.Quantidade));
        this.maisEscalados = r.MaisEscalados.map(m => ({
            chave: m.Id,
            nome: m.MEM_NOME,
            quantidade: m.Quantidade,
            largura: Math.max(4, Math.round((m.Quantidade / maxEsc) * 100)),
            destino: { rota: '/assinante/agenda', query: { mes: this.mesIso, membroId: m.Id } },
            funcao: m.MEM_FUNCAO,
            ativo: m.MEM_ATIVO,
        }));
        this.cidades = this.montarBarras(r.PorCidade, nome => ({ rota: '/assinante/agenda', query: { mes: this.mesIso, cidade: nome } }));
        this.organizadores = this.montarBarras(r.PorOrganizador, () => null);
    }

    private montarBarras(d: DashboardDistribuicao, destino: (nome: string) => BarraLista['destino']): BarraLista[] {
        const itens = d.Itens ?? [];
        const max = Math.max(1, d.Outros, ...itens.map(i => i.Quantidade));
        const barras: BarraLista[] = itens.map(i => ({
            chave: i.Id ?? i.Nome,
            nome: i.Nome,
            quantidade: i.Quantidade,
            largura: Math.max(4, Math.round((i.Quantidade / max) * 100)),
            destino: destino(i.Nome),
        }));
        if (d.Outros > 0) {
            barras.push({ chave: '__outros', nome: 'Outros', quantidade: d.Outros, largura: Math.max(4, Math.round((d.Outros / max) * 100)), destino: null });
        }
        return barras;
    }

    private montarDias(eventos: EventoListItem[]): void {
        // A API já devolve ordenado; reordena só por segurança (data, hora com "a confirmar" por último, nome).
        const ordenados = [...eventos].sort((a, b) =>
            a.EVE_DATA.localeCompare(b.EVE_DATA)
            || (a.EVE_HORA ?? '99:99').localeCompare(b.EVE_HORA ?? '99:99')
            || a.EVE_NOME.localeCompare(b.EVE_NOME));

        const porDia = new Map<string, EventoListItem[]>();
        for (const e of ordenados) {
            const data = e.EVE_DATA.substring(0, 10);
            porDia.set(data, [...(porDia.get(data) ?? []), e]);
        }
        this.dias = [...porDia.entries()].map(([data, lista]) => ({
            data,
            titulo: formatarDataComDiaSemana(data),
            selo: data === this.hoje ? 'Hoje' : data === this.amanha ? 'Amanhã' : null,
            eventos: lista,
        }));

        const ativos = (data: string) => ordenados.filter(e => e.EVE_DATA.substring(0, 10) === data && e.EVE_STATUS !== StatusEvento.Cancelado).length;
        this.hojeQtd = ativos(this.hoje);
        this.amanhaQtd = ativos(this.amanha);
    }
}
