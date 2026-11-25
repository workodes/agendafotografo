import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { GastoFixoListItem } from 'app/models/DTOs/responses/GastoFixoListItem';
import { GastoFixoResumo } from 'app/models/DTOs/responses/GastoFixoResumo';
import { GastoFixoService } from 'app/services/gasto-fixo.service';
import { hojeIso, parseDataIso } from 'app/utils/data-evento';
import { formatarMoeda } from 'app/utils/moeda';
import { forkJoin, Subscription } from 'rxjs';

type Estado = 'carregando' | 'pronto' | 'erro';

const MAXIMO_NA_LISTA = 5;

// Cartão "Gastos fixos" do Dashboard (plano 22): total fixo mensal (`GastoFixo/Resumo`), participação nas despesas do período (só
// quando o pai informa as despesas de "Este mês") e os próximos fixos ativos a cobrar (`GastoFixo/Listar`, ativo=true).
@Component({
    selector: 'app-financeiro-cartao-fixos',
    standalone: true,
    imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
    templateUrl: './financeiro-cartao-fixos.component.html',
    host: { class: 'flex flex-col min-w-0' },
})
export class FinanceiroCartaoFixosComponent implements OnInit {
    private _service = inject(GastoFixoService);
    private _cdr = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);

    /** Despesas do período quando ele é "Este mês" (a linha de participação só aparece com esse valor maior que zero). */
    @Input() despesasMes: number | null = null;

    readonly formatarMoeda = formatarMoeda;

    estado: Estado = 'carregando';
    resumo: GastoFixoResumo | null = null;
    proximos: GastoFixoListItem[] = [];

    private _sub?: Subscription;

    ngOnInit(): void {
        this.carregar();
        this._service.alterado$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.carregar());
        this._destroyRef.onDestroy(() => this._sub?.unsubscribe());
    }

    get vazio(): boolean {
        return !!this.resumo && this.resumo.Ativos + this.resumo.Pausados === 0;
    }

    get restantes(): number {
        return Math.max((this.resumo?.Ativos ?? 0) - this.proximos.length, 0);
    }

    get percentual(): number | null {
        if (!this.resumo || this.resumo.Ativos === 0 || !this.despesasMes || this.despesasMes <= 0) {
            return null;
        }
        return Math.round((this.resumo.TotalMensalAtivos / this.despesasMes) * 100);
    }

    get textoContagem(): string {
        const r = this.resumo!;
        return `${r.Ativos} ${r.Ativos === 1 ? 'ativo' : 'ativos'}, ${r.Pausados} ${r.Pausados === 1 ? 'pausado' : 'pausados'}`;
    }

    carregar(): void {
        this.estado = 'carregando';
        this._cdr.markForCheck();
        this._sub?.unsubscribe();
        this._sub = forkJoin([this._service.Resumo(), this._service.GetAllPaginated(1, 100, '', 'true')]).subscribe({
            next: ([resumo, lista]) => {
                this.resumo = resumo;
                this.proximos = ordenarPorProximaCobranca(lista.Data ?? []).slice(0, MAXIMO_NA_LISTA);
                this.estado = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                this.estado = 'erro';
                this._cdr.markForCheck();
            },
        });
    }

    trackItem(_: number, g: GastoFixoListItem): string {
        return g.Id;
    }
}

// Próxima cobrança a partir de hoje (hoje conta). Em meses curtos o dia vale o último dia do mês, como na geração da API.
function proximaCobranca(dia: number, hoje: Date): number {
    const dataNoMes = (ano: number, mes: number): Date => {
        const ultimo = new Date(ano, mes + 1, 0).getDate();
        return new Date(ano, mes, Math.min(dia, ultimo));
    };
    const neste = dataNoMes(hoje.getFullYear(), hoje.getMonth());
    return (neste.getTime() >= hoje.getTime() ? neste : dataNoMes(hoje.getFullYear(), hoje.getMonth() + 1)).getTime();
}

function ordenarPorProximaCobranca(itens: GastoFixoListItem[]): GastoFixoListItem[] {
    const hoje = parseDataIso(hojeIso()) ?? new Date();
    return itens
        .filter(g => g.GAF_ATIVO)
        .map(g => ({ g, quando: proximaCobranca(g.GAF_DIA, hoje) }))
        .sort((a, b) => a.quando - b.quando || a.g.GAF_TITULO.localeCompare(b.g.GAF_TITULO, 'pt-BR'))
        .map(x => x.g);
}
