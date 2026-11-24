import { NgIf } from '@angular/common';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTabsModule } from '@angular/material/tabs';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PaginaCabecalhoComponent } from 'app/modules/shared/components/pagina-cabecalho/pagina-cabecalho.component';
import { descreverPeriodo } from 'app/utils/periodo-financeiro';
import { filter } from 'rxjs';
import { FinanceiroFiltroService } from './financeiro-filtro.service';
import { PeriodoSeletorComponent } from './periodo-seletor/periodo-seletor.component';

// Casca do Financeiro (plano 22): cabeçalho, seletor de período (some em Fixos) e as abas como rotas filhas
// (lancamentos, dashboard, fixos). O resolver `financeiroResolver` gera os lançamentos dos gastos fixos antes de abrir a tela.
@Component({
    selector: 'app-financeiro',
    standalone: true,
    imports: [NgIf, RouterLink, RouterLinkActive, RouterOutlet, MatTabsModule, PaginaCabecalhoComponent, PeriodoSeletorComponent],
    providers: [FinanceiroFiltroService],
    templateUrl: './financeiro.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0' },
})
export class FinanceiroComponent implements OnInit {
    private _router = inject(Router);
    private _title = inject(Title);
    private _destroyRef = inject(DestroyRef);
    readonly filtro = inject(FinanceiroFiltroService);

    ehFixos = false;
    subtitulo = '';

    ngOnInit(): void {
        this._title.setTitle('Financeiro');
        this.atualizar();
        this._router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed(this._destroyRef))
            .subscribe(() => this.atualizar());
        this.filtro.periodo$.pipe(takeUntilDestroyed(this._destroyRef)).subscribe(() => this.atualizar());
    }

    private atualizar(): void {
        this.ehFixos = this._router.url.split('?')[0].endsWith('/fixos');
        this.subtitulo = this.ehFixos
            ? 'Gastos que se repetem todo mês e viram lançamentos de Despesa.'
            : `Período: ${descreverPeriodo(this.filtro.periodo)}`;
    }
}
