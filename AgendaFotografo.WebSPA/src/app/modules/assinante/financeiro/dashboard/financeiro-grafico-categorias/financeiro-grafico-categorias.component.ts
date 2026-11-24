import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { CATEGORIA_LANCAMENTO_ROTULO } from 'app/models/enums/CategoriaLancamento';
import { chartBase, COR_DESPESA_GRAFICO, COR_TEXTO_GRAFICO, textoMoeda } from 'app/utils/grafico';
import { formatarMoeda } from 'app/utils/moeda';
import { NgApexchartsModule } from 'ng-apexcharts';

interface BarraCategoria {
    nome: string;
    total: number;
}

// Gráfico 1 do Financeiro: despesas por categoria em barras horizontais (maior para menor; só despesas, como no Início).
@Component({
    selector: 'app-financeiro-grafico-categorias',
    standalone: true,
    imports: [NgFor, NgIf, NgApexchartsModule],
    templateUrl: './financeiro-grafico-categorias.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceiroGraficoCategoriasComponent {
    @Input() set dados(valor: FinanceiroDashboard | null) {
        if (valor) {
            this._montar(valor);
        }
    }

    barras: BarraCategoria[] = [];
    vazio = true;
    descricao = '';

    series: any[] = [];
    chart: any = chartBase(200);
    colors: string[] = [COR_DESPESA_GRAFICO];
    plotOptions: any = { bar: { horizontal: true, barHeight: '58%', borderRadius: 3, dataLabels: { position: 'top' } } };
    dataLabels: any = {
        enabled: true,
        textAnchor: 'start',
        offsetX: 8,
        formatter: (v: number) => formatarMoeda(v),
        style: { fontSize: '12px', fontWeight: 600, colors: [COR_TEXTO_GRAFICO] },
        background: { enabled: false },
    };
    xaxis: any = { categories: [] as string[], labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } };
    yaxis: any = { labels: { maxWidth: 140, style: { colors: COR_TEXTO_GRAFICO, fontSize: '12px' } } };
    grid: any = { show: false, padding: { left: 4, right: 96 } };
    legend: any = { show: false };
    tooltip: any = { y: { formatter: (v: number) => textoMoeda(v) } };
    responsive: any[] = [{ breakpoint: 600, options: { yaxis: { labels: { maxWidth: 96 } }, grid: { padding: { right: 84 } } } }];

    readonly formatar = formatarMoeda;

    private _montar(d: FinanceiroDashboard): void {
        this.barras = (d.PorCategoria ?? []).map(c => ({ nome: CATEGORIA_LANCAMENTO_ROTULO[c.Categoria] ?? 'Outros', total: c.Total }));
        this.vazio = this.barras.length === 0;
        this.descricao = this.vazio
            ? 'Nenhuma despesa no período.'
            : `Despesas por categoria: ${this.barras.map(b => `${b.nome} ${formatarMoeda(b.total)}`).join(', ')}.`;
        this.series = [{ name: 'Despesas', data: this.barras.map(b => b.total) }];
        this.xaxis = { ...this.xaxis, categories: this.barras.map(b => b.nome) };
        this.chart = chartBase(Math.min(360, Math.max(120, this.barras.length * 40 + 24)));
    }
}
