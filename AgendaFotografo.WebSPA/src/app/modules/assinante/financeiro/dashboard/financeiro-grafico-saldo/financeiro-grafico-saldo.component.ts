import { NgFor } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { chartBase, COR_SECUNDARIA_GRAFICO, textoMoeda } from 'app/utils/grafico';
import { formatarMoeda, formatarMoedaCompacta, formatarSaldo } from 'app/utils/moeda';
import { rotuloSerie, rotuloSerieExtenso } from 'app/utils/periodo-financeiro';
import { NgApexchartsModule } from 'ng-apexcharts';

interface LinhaTabela {
    extenso: string;
    saldo: string;
}

// Gráfico 3 do Financeiro: evolução do saldo (saldo acumulado dentro do período, começando em 0; o último ponto é o Saldo do período).
@Component({
    selector: 'app-financeiro-grafico-saldo',
    standalone: true,
    imports: [NgFor, NgApexchartsModule],
    templateUrl: './financeiro-grafico-saldo.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceiroGraficoSaldoComponent {
    @Input() set dados(valor: FinanceiroDashboard | null) {
        if (valor) {
            this._montar(valor);
        }
    }

    titulo = 'Evolução do saldo';
    descricao = '';
    linhas: LinhaTabela[] = [];

    series: any[] = [];
    chart: any = { ...chartBase(320), type: 'line' };
    // Marrom do apoio (#7C2D12): linha sem texto, contraste alto sobre o fundo branco.
    colors: string[] = ['#7C2D12'];
    stroke: any = { curve: 'straight', width: 3 };
    markers: any = { size: 3, strokeWidth: 0, hover: { size: 5 } };
    dataLabels: any = { enabled: false };
    xaxis: any = { categories: [] as string[], labels: { rotate: -45, rotateAlways: false, hideOverlappingLabels: true, trim: false, maxHeight: 56, style: { colors: COR_SECUNDARIA_GRAFICO, fontSize: '11px' } }, axisTicks: { show: false }, tickPlacement: 'on' };
    yaxis: any = { labels: { formatter: (v: number) => formatarMoedaCompacta(v), style: { colors: COR_SECUNDARIA_GRAFICO, fontSize: '11px' } } };
    grid: any = { borderColor: '#F0E2D6', strokeDashArray: 3, padding: { left: 8, right: 16 } };
    legend: any = { show: false };
    tooltip: any = { y: { formatter: (v: number) => textoMoeda(v) } };

    private _montar(d: FinanceiroDashboard): void {
        const serie = d.Serie ?? [];
        this.titulo = d.PorDia ? 'Evolução do saldo por dia' : 'Evolução do saldo por mês';
        this.linhas = serie.map(s => ({ extenso: rotuloSerieExtenso(s.Periodo, d.PorDia), saldo: formatarSaldo(s.SaldoAcumulado) }));
        this.descricao = `${this.titulo}, saldo acumulado: ${this.linhas.map(l => `${l.extenso} ${l.saldo}`).join('; ')}. Saldo do período ${formatarMoeda(d.Saldo)}.`;
        this.series = [{ name: 'Saldo acumulado', data: serie.map(s => s.SaldoAcumulado) }];
        this.xaxis = { ...this.xaxis, categories: serie.map(s => rotuloSerie(s.Periodo, d.PorDia)) };
    }
}
