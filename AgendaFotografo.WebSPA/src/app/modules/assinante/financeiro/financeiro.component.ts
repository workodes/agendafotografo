import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { PaginaCabecalhoComponent } from 'app/modules/shared/components/pagina-cabecalho/pagina-cabecalho.component';
import { descreverPeriodo } from 'app/utils/periodo-financeiro';
import { filter } from 'rxjs';
import { FinanceiroFiltroService } from './financeiro-filtro.service';
import { PeriodoSeletorComponent } from './periodo-seletor/periodo-seletor.component';

// Casca do Financeiro (plano 22): cabeçalho com o título da tela atual (Lançamentos ou Dashboard) e o seletor de período, que
// vale para as duas. As telas são rotas filhas (menu Financeiro > Lançamentos | Dashboard). O resolver `financeiroResolver`
// gera os lançamentos dos gastos fixos antes de abrir.
@Component({
    selector: 'app-financeiro',
    standalone: true,
    imports: [RouterOutlet, PaginaCabecalhoComponent, PeriodoSeletorComponent],
    providers: [FinanceiroFiltroService],
    templateUrl: './financeiro.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0' },
})
export class FinanceiroComponent implements OnInit {
    private _router = inject(Router);
    private _title = inject(Title);
    private _destroyRef = inject(DestroyRef);
    readonly filtro = inject(FinanceiroFiltroService);

    titulo = 'Lançamentos';
    subtitulo = '';

    ngOnInit(): void {
        this.atualizar();
        this._router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this._destroyRef))
            .subscribe(() => this.atualizar());
        this.filtro.periodo$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.atualizar());
    }

    private atualizar(): void {
        const ehDashboard = this._router.url.split(/[?#]/)[0].endsWith('/dashboard');
        this.titulo = ehDashboard ? 'Dashboard' : 'Lançamentos';
        this.subtitulo = `Período: ${descreverPeriodo(this.filtro.periodo)}`;
        this._title.setTitle(this.titulo);
    }
}
