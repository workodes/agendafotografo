import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LancamentoFiltro } from 'app/models/DTOs/filters/LancamentoFiltro';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { DashboardService } from 'app/services/dashboard.service';
import { LancamentoService } from 'app/services/lancamento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { Subscription } from 'rxjs';
import { FinanceiroFiltroService } from '../financeiro-filtro.service';
import { FinanceiroResumoCartoesComponent } from '../financeiro-resumo-cartoes/financeiro-resumo-cartoes.component';
import { FinanceiroCartaoFixosComponent } from './financeiro-cartao-fixos/financeiro-cartao-fixos.component';
import { FinanceiroGraficoCategoriasComponent } from './financeiro-grafico-categorias/financeiro-grafico-categorias.component';
import { FinanceiroGraficoMensalComponent } from './financeiro-grafico-mensal/financeiro-grafico-mensal.component';
import { FinanceiroGraficoSaldoComponent } from './financeiro-grafico-saldo/financeiro-grafico-saldo.component';

type Estado = 'carregando' | 'pronto' | 'erro';

// Tela Dashboard do Financeiro (plano 22): cartões de resumo, 3 gráficos (receitas × despesas, evolução do saldo e despesas por
// categoria, de Dashboard/Financeiro) e o cartão de gastos fixos, todos com o período compartilhado. Recarrega quando o período muda
// e quando um lançamento muda (os cartões de resumo e o de fixos se recarregam sozinhos).
@Component({
    selector: 'app-financeiro-dashboard',
    standalone: true,
    imports: [
        NgIf, MatButtonModule, MatProgressSpinnerModule,
        FinanceiroResumoCartoesComponent, FinanceiroCartaoFixosComponent,
        FinanceiroGraficoCategoriasComponent, FinanceiroGraficoMensalComponent, FinanceiroGraficoSaldoComponent,
    ],
    templateUrl: './financeiro-dashboard.component.html',
    host: { class: 'block w-full min-w-0' },
})
export class FinanceiroDashboardComponent implements OnInit {
    private _service = inject(DashboardService);
    private _lancamentos = inject(LancamentoService);
    private _filtro = inject(FinanceiroFiltroService);
    private _cdr = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);

    estado: Estado = 'carregando';
    erro = '';
    dados: FinanceiroDashboard | null = null;
    // Período dos cartões de resumo (nova referência a cada mudança do período).
    filtroResumo: LancamentoFiltro = {};
    // Despesas do período, só quando ele é "Este mês" (alimenta a linha "Fixos representam X%" do cartão de gastos fixos).
    despesasMes: number | null = null;

    private _sub?: Subscription;

    ngOnInit(): void {
        // O período emite ao assinar (BehaviorSubject): é a carga inicial e a de cada mudança do seletor.
        this._filtro.periodo$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(p => {
            this.filtroResumo = { dataDe: p.dataDe, dataAte: p.dataAte };
            this.carregar();
        });
        this._lancamentos.alterado$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.carregar());
        this._destroyRef.onDestroy(() => this._sub?.unsubscribe());
    }

    // Sem lançamentos no período a API devolve DataDe/DataAte nulas e Serie vazia: o vazio se trata por Serie.length === 0.
    get vazio(): boolean {
        return !!this.dados && (this.dados.Serie?.length ?? 0) === 0;
    }

    carregar(): void {
        this.estado = 'carregando';
        this._cdr.markForCheck();
        this._sub?.unsubscribe();
        const p = this._filtro.periodo;
        this._sub = this._service.Financeiro(p.dataDe, p.dataAte).subscribe({
            next: resp => {
                this.dados = resp;
                this.despesasMes = p.tipo === 'mes' && resp.TotalDespesas > 0 ? resp.TotalDespesas : null;
                this.estado = 'pronto';
                this._cdr.markForCheck();
            },
            error: error => {
                this.erro = mensagemErro(error, 'Não foi possível carregar os gráficos.');
                this.estado = 'erro';
                this._cdr.markForCheck();
            },
        });
    }
}
