import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { chartBase, COR_DESPESA_GRAFICO, COR_RECEITA_GRAFICO, COR_SECUNDARIA_GRAFICO, COR_TEXTO_GRAFICO, textoMoeda } from 'app/utils/grafico';
import { formatarMoeda, formatarMoedaCompacta } from 'app/utils/moeda';
import { rotuloSerie, rotuloSerieExtenso } from 'app/utils/periodo-financeiro';
import { NgApexchartsModule } from 'ng-apexcharts';

interface LinhaTabela {
    extenso: string;
    receitas: string;
    despesas: string;
}

// Gráfico 2 do Financeiro: receitas × despesas em barras agrupadas, por dia (período até 31 dias) ou por mês.
@Component({
    selector: 'app-financeiro-grafico-mensal',
    standalone: true,
    imports: [NgFor, NgIf, NgApexchartsModule],
    templateUrl: './financeiro-grafico-mensal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceiroGraficoMensalComponent {
    @Input() set dados(valor: FinanceiroDashboard | null) {
        if (valor) {
            this._montar(valor);
        }
    }

    titulo = 'Receitas e despesas';
    descricao = '';
    linhas: LinhaTabela[] = [];

    series: any[] = [];
    chart: any = chartBase(320);
    colors: string[] = [COR_RECEITA_GRAFICO, COR_DESPESA_GRAFICO];
    plotOptions: any = { bar: { columnWidth: '70%', borderRadius: 2 } };
    dataLabels: any = { enabled: false };
    stroke: any = { show: true, width: 1, colors: ['transparent'] };
    xaxis: any = { categories: [] as string[], labels: { rotate: -45, rotateAlways: false, hideOverlappingLabels: true, trim: false, maxHeight: 56, style: { colors: COR_SECUNDARIA_GRAFICO, fontSize: '11px' } }, axisTicks: { show: false } };
    yaxis: any = { labels: { formatter: (v: number) => formatarMoedaCompacta(v), style: { colors: COR_SECUNDARIA_GRAFICO, fontSize: '11px' } } };
    grid: any = { borderColor: '#F0E2D6', strokeDashArray: 3, padding: { left: 8, right: 16 } };
    legend: any = { show: true, position: 'top', horizontalAlign: 'left', fontSize: '13px', labels: { colors: COR_TEXTO_GRAFICO }, markers: { size: 6 } };
    tooltip: any = { shared: true, intersect: false, y: { formatter: (v: number) => textoMoeda(v) } };

    private _montar(d: FinanceiroDashboard): void {
        const serie = d.Serie ?? [];
        this.titulo = d.PorDia ? 'Receitas e despesas por dia' : 'Receitas e despesas por mês';
        this.linhas = serie.map(s => ({
            extenso: rotuloSerieExtenso(s.Periodo, d.PorDia),
            receitas: formatarMoeda(s.Receitas),
            despesas: formatarMoeda(s.Despesas),
        }));
        this.descricao = `${this.titulo}: ${this.linhas.map(l => `${l.extenso}, receitas ${l.receitas}, despesas ${l.despesas}`).join('; ')}.`;
        this.series = [
            { name: 'Receitas', data: serie.map(s => s.Receitas) },
            { name: 'Despesas', data: serie.map(s => s.Despesas) },
        ];
        this.xaxis = { ...this.xaxis, categories: serie.map(s => rotuloSerie(s.Periodo, d.PorDia)) };
    }
}
