import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { LancamentoFiltro } from 'app/models/DTOs/filters/LancamentoFiltro';
import { LancamentoResumo } from 'app/models/DTOs/responses/LancamentoResumo';
import { LancamentoService } from 'app/services/lancamento.service';
import { formatarMoeda, formatarSaldo } from 'app/utils/moeda';
import { Subscription } from 'rxjs';

type Estado = 'carregando' | 'pronto' | 'erro';

// Cartões Receitas, Despesas, Saldo e Lançamentos (plano 22), de `Lancamento/Resumo`. Compartilhado por Lançamentos (período + busca)
// e Dashboard (só o período). Recarrega quando o filtro muda (nova referência) e em `LancamentoService.alterado$`, então quem usa
// só precisa trocar o objeto `filtro`.
@Component({
    selector: 'app-financeiro-resumo-cartoes',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './financeiro-resumo-cartoes.component.html',
    host: { class: 'block w-full min-w-0' },
})
export class FinanceiroResumoCartoesComponent implements OnInit {
    private _service = inject(LancamentoService);
    private _cdr = inject(ChangeDetectorRef);
    private _destroyRef = inject(DestroyRef);

    @Input({ required: true }) set filtro(valor: LancamentoFiltro) {
        this._filtro = valor;
        if (this._iniciado) {
            this.carregar();
        }
    }

    readonly formatarMoeda = formatarMoeda;
    readonly formatarSaldo = formatarSaldo;
    readonly esqueleto = [1, 2, 3, 4];

    estado: Estado = 'carregando';
    resumo: LancamentoResumo | null = null;

    private _filtro: LancamentoFiltro = {};
    private _iniciado = false;
    private _sub?: Subscription;

    ngOnInit(): void {
        this._iniciado = true;
        this._service.alterado$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.carregar());
        this._destroyRef.onDestroy(() => this._sub?.unsubscribe());
        this.carregar();
    }

    carregar(): void {
        this.estado = 'carregando';
        this._cdr.markForCheck();
        this._sub?.unsubscribe();
        this._sub = this._service.Resumo(this._filtro).subscribe({
            next: resp => {
                this.resumo = resp;
                this.estado = 'pronto';
                this._cdr.markForCheck();
            },
            error: () => {
                this.estado = 'erro';
                this._cdr.markForCheck();
            },
        });
    }
}
