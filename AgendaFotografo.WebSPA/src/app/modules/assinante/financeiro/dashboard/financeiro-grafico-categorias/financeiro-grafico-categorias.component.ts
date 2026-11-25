import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { CATEGORIA_LANCAMENTO_ROTULO } from 'app/models/enums/CategoriaLancamento';
import { COR_DESPESA_GRAFICO } from 'app/utils/grafico';
import { formatarMoeda } from 'app/utils/moeda';

interface BarraCategoria {
    nome: string;
    total: number;
    /** 0 a 100, em relação à maior categoria. */
    percentual: number;
}

// Despesas por categoria (maior para menor; só despesas, como no Início). Lista de barras em HTML: o nome e o valor ficam acima da
// barra, sem rótulo de eixo para cortar ("Software e assinaturas") nem valor por cima da ponta da barra.
@Component({
    selector: 'app-financeiro-grafico-categorias',
    standalone: true,
    imports: [NgFor, NgIf],
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
    readonly corBarra = COR_DESPESA_GRAFICO;
    readonly formatar = formatarMoeda;

    private _montar(d: FinanceiroDashboard): void {
        const itens = (d.PorCategoria ?? []).map(c => ({ nome: CATEGORIA_LANCAMENTO_ROTULO[c.Categoria] ?? 'Outros', total: c.Total }));
        const maior = Math.max(...itens.map(i => i.total), 0);
        this.barras = itens.map(i => ({ ...i, percentual: maior > 0 ? Math.max((i.total / maior) * 100, 2) : 0 }));
        this.vazio = this.barras.length === 0;
        this.descricao = this.vazio
            ? 'Nenhuma despesa no período.'
            : `Despesas por categoria: ${this.barras.map(b => `${b.nome} ${formatarMoeda(b.total)}`).join(', ')}.`;
    }
}
