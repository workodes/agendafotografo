import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, NgZone } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardDistribuicao } from 'app/models/DTOs/responses/DashboardResumo';
import { chartBase, COR_APOIO_GRAFICO, COR_TEXTO_GRAFICO, corPrincipalGrafico, textoEventos } from 'app/utils/grafico';
import { NgApexchartsModule } from 'ng-apexcharts';

interface BarraTipo {
    id: string | null;
    nome: string;
    quantidade: number;
}

// Gráfico 2 do Início: eventos não cancelados do mês por tipo (barras horizontais; "Outros" em cinza).
@Component({
    selector: 'app-inicio-grafico-tipos',
    standalone: true,
    imports: [NgFor, NgIf, RouterLink, NgApexchartsModule],
    templateUrl: './inicio-grafico-tipos.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioGraficoTiposComponent {
    @Input() set dados(valor: { distribuicao: DashboardDistribuicao; mesIso: string } | null) {
        if (valor) {
            this._montar(valor.distribuicao, valor.mesIso);
        }
    }

    barras: BarraTipo[] = [];
    vazio = true;
    mesIso = '';
    descricao = '';

    series: any[] = [];
    chart: any = chartBase(200);
    colors: string[] = [];
    plotOptions: any = { bar: { horizontal: true, distributed: true, barHeight: '58%', borderRadius: 3, dataLabels: { position: 'top' } } };
    dataLabels: any = {
        enabled: true,
        textAnchor: 'start',
        offsetX: 8,
        style: { fontSize: '12px', fontWeight: 600, colors: [COR_TEXTO_GRAFICO] },
        background: { enabled: false },
    };
    xaxis: any = { categories: [] as string[], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
    yaxis: any = { labels: { maxWidth: 140, style: { colors: COR_TEXTO_GRAFICO, fontSize: '12px' } } };
    grid: any = { show: false, padding: { left: 4, right: 24 } };
    legend: any = { show: false };
    tooltip: any = { y: { formatter: (v: number) => textoEventos(v) } };
    responsive: any[] = [{ breakpoint: 600, options: { yaxis: { labels: { maxWidth: 96 } } } }];

    constructor(private _router: Router, private _zone: NgZone) { }

    private _montar(d: DashboardDistribuicao, mesIso: string): void {
        this.mesIso = mesIso;
        this.barras = (d.Itens ?? []).map(i => ({ id: i.Id, nome: i.Nome, quantidade: i.Quantidade }));
        const todas: BarraTipo[] = d.Outros > 0 ? [...this.barras, { id: null, nome: 'Outros', quantidade: d.Outros }] : this.barras;
        this.vazio = todas.length === 0;
        this.descricao = this.vazio ? 'Nenhum evento no mês.' : `Eventos do mês por tipo: ${todas.map(b => `${b.nome} ${b.quantidade}`).join(', ')}.`;
        this.series = [{ name: 'Eventos', data: todas.map(b => b.quantidade) }];
        this.colors = todas.map(b => (b.id === null ? COR_APOIO_GRAFICO : corPrincipalGrafico()));
        this.xaxis = { ...this.xaxis, categories: todas.map(b => b.nome) };
        this.chart = {
            ...chartBase(Math.min(240, Math.max(120, todas.length * 40 + 24))),
            events: {
                // Clique num tipo abre a Agenda filtrada (o evento do Apex roda fora da zona do Angular).
                dataPointSelection: (_e: unknown, _c: unknown, config: { dataPointIndex: number }) => {
                    const barra = todas[config.dataPointIndex];
                    if (barra?.id) {
                        this._zone.run(() => this._router.navigate(['/assinante/agenda'], { queryParams: { mes: this.mesIso, tipoEventoId: barra.id } }));
                    }
                },
            },
        };
    }

    queryTipo(b: BarraTipo): Record<string, string> {
        return { mes: this.mesIso, tipoEventoId: b.id! };
    }
}
