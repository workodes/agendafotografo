import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { calcularPeriodo, PERIODO_PADRAO, PeriodoFinanceiro } from 'app/utils/periodo-financeiro';

// Período compartilhado do Financeiro (plano 22). Fornecido pelo FinanceiroComponent (escopo da tela): o seletor do cabeçalho
// grava aqui e as abas Lançamentos e Dashboard leem. Abre em "Este mês"; fica só em memória (F5 volta ao padrão).
@Injectable()
export class FinanceiroFiltroService {
    private readonly _periodo = new BehaviorSubject<PeriodoFinanceiro>(calcularPeriodo(PERIODO_PADRAO)!);

    /** Emite o período atual ao assinar e a cada mudança. */
    readonly periodo$ = this._periodo.asObservable();

    get periodo(): PeriodoFinanceiro {
        return this._periodo.value;
    }

    Definir(periodo: PeriodoFinanceiro): void {
        this._periodo.next(periodo);
    }
}
