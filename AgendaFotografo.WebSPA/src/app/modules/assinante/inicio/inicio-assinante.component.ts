import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { UsuarioService } from 'app/core/services/usuario.service';
import { AvisoItem } from 'app/models/DTOs/responses/AvisoItem';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { GravidadeAviso } from 'app/models/enums/GravidadeAviso';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { TipoAviso } from 'app/models/enums/TipoAviso';
import { AvisoItemComponent } from 'app/modules/shared/components/aviso-item/aviso-item.component';
import { AvisoService } from 'app/services/aviso.service';
import { EventoService } from 'app/services/evento.service';
import { diaSemana, formatarData, formatarDataComDiaSemana, formatarHora, hojeIso, somarDiasIso } from 'app/utils/data-evento';
import { forkJoin } from 'rxjs';

interface DiaDoInicio {
    data: string;
    titulo: string; // "Sáb 14/11"
    selo: string | null; // "Hoje" | "Amanhã"
    eventos: EventoListItem[];
}

// Início do assinante (plano 08): números do dia, próximos 7 dias e avisos. Usa só Evento/Agenda e Aviso/Listar, sem recalcular nenhuma regra.
@Component({
    selector: 'app-inicio-assinante',
    standalone: true,
    imports: [NgClass, NgFor, NgIf, RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, AvisoItemComponent],
    templateUrl: './inicio-assinante.component.html',
})
export class InicioAssinanteComponent implements OnInit {
    readonly STATUS_ROTULO = STATUS_EVENTO_ROTULO;
    readonly STATUS_COR = STATUS_EVENTO_COR;
    readonly formatarHora = formatarHora;
    readonly Cancelado = StatusEvento.Cancelado;

    estado: 'carregando' | 'pronto' | 'erro' = 'carregando';
    nome = '';
    saudacao = '';
    dataExtenso = '';

    hoje = '';
    amanha = '';
    hojeQtd = 0;
    amanhaQtd = 0;
    vencidasQtd = 0;
    vencendoQtd = 0;
    dias: DiaDoInicio[] = [];
    totalEventos = 0;
    criticos: AvisoItem[] = [];
    atencao: AvisoItem[] = [];
    totalAvisos = 0;
    private _eventoProximo = new Map<string, AvisoItem>();

    constructor(
        private _eventoService: EventoService,
        private _avisoService: AvisoService,
        private _usuarioService: UsuarioService,
        private _cdr: ChangeDetectorRef,
        titleService: Title,
    ) {
        titleService.setTitle('Início');
    }

    ngOnInit(): void {
        this._usuarioService.usuario$.subscribe(u => {
            this.nome = u?.FullName?.split(' ')[0] ?? '';
            this._cdr.markForCheck();
        });
        this.carregar();
    }

    carregar(): void {
        this.estado = 'carregando';
        this.hoje = hojeIso();
        this.amanha = somarDiasIso(this.hoje, 1);
        const hora = new Date().getHours();
        this.saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
        const ds = diaSemana(this.hoje);
        this.dataExtenso = `${ds.charAt(0).toUpperCase()}${ds.slice(1)}, ${formatarData(this.hoje)}`;

        forkJoin({
            eventos: this._eventoService.Agenda({ dataDe: this.hoje, dataAte: somarDiasIso(this.hoje, 7) }),
            avisos: this._avisoService.Listar(),
        }).subscribe({
            next: ({ eventos, avisos }) => {
                const itens = avisos.Itens ?? [];
                this.vencidasQtd = itens.find(a => a.Tipo === TipoAviso.PendenciasVencidas)?.Quantidade ?? 0;
                this.vencendoQtd = itens.find(a => a.Tipo === TipoAviso.PendenciasVencendo)?.Quantidade ?? 0;
                this.criticos = itens.filter(a => a.Gravidade === GravidadeAviso.Critico);
                this.atencao = itens.filter(a => a.Gravidade !== GravidadeAviso.Critico);
                this.totalAvisos = avisos.Total;
                this._eventoProximo = new Map(itens.filter(a => a.Tipo === TipoAviso.EventoProximo && a.EventoId).map(a => [a.EventoId!, a]));

                this.montarDias(eventos ?? []);
                this.estado = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                this.estado = 'erro';
                this._cdr.markForCheck();
            },
        });
    }

    /** Aviso `EventoProximo` do evento (selo "!" e Detalhes), se houver. */
    avisoDoEvento(evento: EventoListItem): AvisoItem | undefined {
        return this._eventoProximo.get(evento.Id);
    }

    trackByChave(_: number, aviso: AvisoItem): string {
        return aviso.Chave;
    }

    trackByData(_: number, dia: DiaDoInicio): string {
        return dia.data;
    }

    trackById(_: number, evento: EventoListItem): string {
        return evento.Id;
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
        this.totalEventos = ordenados.length;

        const ativos = (data: string) => ordenados.filter(e => e.EVE_DATA.substring(0, 10) === data && e.EVE_STATUS !== StatusEvento.Cancelado).length;
        this.hojeQtd = ativos(this.hoje);
        this.amanhaQtd = ativos(this.amanha);
    }
}
