import { NgIf } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { DashboardService } from 'app/services/dashboard.service';
import { LancamentoService } from 'app/services/lancamento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { Subscription } from 'rxjs';
import { FinanceiroFiltroService } from '../financeiro-filtro.service';
import { FinanceiroGraficoCategoriasComponent } from './financeiro-grafico-categorias/financeiro-grafico-categorias.component';
import { FinanceiroGraficoMensalComponent } from './financeiro-grafico-mensal/financeiro-grafico-mensal.component';
import { FinanceiroGraficoSaldoComponent } from './financeiro-grafico-saldo/financeiro-grafico-saldo.component';

type Estado = 'carregando' | 'pronto' | 'erro';

// Aba Dashboard do Financeiro (plano 22): 3 gráficos (despesas por categoria, receitas × despesas e evolução do saldo)
// alimentados por Dashboard/Financeiro com o período compartilhado. Recarrega quando o período muda e quando um lançamento muda.
@Component({
    selector: 'app-financeiro-dashboard',
    standalone: true,
    imports: [
        NgIf, MatButtonModule, MatProgressSpinnerModule,
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

    private _sub?: Subscription;

    ngOnInit(): void {
        // O período emite ao assinar (BehaviorSubject): é a carga inicial e a de cada mudança do seletor.
        this._filtro.periodo$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.carregar());
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
