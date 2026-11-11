import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, NgZone } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardStatusContagem } from 'app/models/DTOs/responses/DashboardResumo';
import { STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { chartBase, COR_APOIO_GRAFICO, COR_SECUNDARIA_GRAFICO, COR_TEXTO_GRAFICO, corPrincipalGrafico, textoEventos } from 'app/utils/grafico';
import { NgApexchartsModule } from 'ng-apexcharts';

const STATUS = [StatusEvento.Pendente, StatusEvento.Confirmado, StatusEvento.Realizado, StatusEvento.Cancelado];

// Gráfico 1 do Início: eventos do mês por status, comparados com o mês anterior (barras verticais agrupadas).
@Component({
    selector: 'app-inicio-grafico-status',
    standalone: true,
    imports: [NgFor, NgIf, RouterLink, NgApexchartsModule],
    templateUrl: './inicio-grafico-status.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioGraficoStatusComponent {
    @Input() set dados(valor: { mes: DashboardStatusContagem; anterior: DashboardStatusContagem; mesIso: string } | null) {
        if (valor) {
            this._montar(valor.mes, valor.anterior, valor.mesIso);
        }
    }

    readonly rotulos = STATUS.map(s => STATUS_EVENTO_ROTULO[s]);
    atual: number[] = [];
    anterior: number[] = [];
    mesIso = '';
    descricao = '';
    vazio = true;

    series: any[] = [];
    chart: any = chartBase(240);
    colors: string[] = [];
    plotOptions: any = { bar: { columnWidth: '62%', borderRadius: 3, dataLabels: { position: 'top' } } };
    dataLabels: any = {
        enabled: true,
        offsetY: -22,
        style: { fontSize: '12px', fontWeight: 600, colors: [COR_TEXTO_GRAFICO] },
        background: { enabled: false },
    };
    xaxis: any = {
        categories: this.rotulos,
        labels: { style: { colors: COR_SECUNDARIA_GRAFICO, fontSize: '12px' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
    };
    yaxis: any = { show: false, min: 0 };
    grid: any = { show: false, padding: { top: 16, left: 4, right: 4 } };
    legend: any = { position: 'top', horizontalAlign: 'left', fontSize: '12px', labels: { colors: COR_TEXTO_GRAFICO } };
    tooltip: any = { y: { formatter: (v: number) => textoEventos(v) } };
    stroke: any = { show: true, width: 2, colors: ['transparent'] };
    responsive: any[] = [{ breakpoint: 600, options: { chart: { height: 220 }, dataLabels: { style: { fontSize: '11px' } } } }];

    constructor(private _router: Router, private _zone: NgZone) { }

    private _montar(mes: DashboardStatusContagem, anterior: DashboardStatusContagem, mesIso: string): void {
        this.mesIso = mesIso;
        this.atual = [mes.Pendentes, mes.Confirmados, mes.Realizados, mes.Cancelados];
        this.anterior = [anterior.Pendentes, anterior.Confirmados, anterior.Realizados, anterior.Cancelados];
        this.vazio = this.atual.every(n => n === 0) && this.anterior.every(n => n === 0);
        this.series = [
            { name: 'Este mês', data: this.atual },
            { name: 'Mês anterior', data: this.anterior },
        ];
        this.colors = [corPrincipalGrafico(), COR_APOIO_GRAFICO];
        const parte = (nums: number[]) => STATUS.map((_, i) => `${this.rotulos[i]} ${nums[i]}`).join(', ');
        this.descricao = `Eventos por status. Este mês: ${parte(this.atual)}. Mês anterior: ${parte(this.anterior)}.`;
        this.chart = {
            ...chartBase(240),
            events: {
                // Clique numa barra do mês atual abre a Agenda filtrada pelo status (o evento do Apex roda fora da zona do Angular).
                dataPointSelection: (_e: unknown, _c: unknown, config: { seriesIndex: number; dataPointIndex: number }) => {
                    if (config.seriesIndex === 0) {
                        this._zone.run(() => this._abrir(STATUS[config.dataPointIndex]));
                    }
                },
            },
        };
    }

    queryStatus(i: number): Record<string, string | number> {
        return { mes: this.mesIso, status: STATUS[i] };
    }

    private _abrir(status: number): void {
        this._router.navigate(['/assinante/agenda'], { queryParams: { mes: this.mesIso, status } });
    }
}
