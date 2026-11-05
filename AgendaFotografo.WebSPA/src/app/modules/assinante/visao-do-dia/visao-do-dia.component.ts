import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DiaEventoItem, DiaResponse } from 'app/models/DTOs/responses/DiaResponse';
import { FUNCAO_MEMBRO, FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO, StatusEvento } from 'app/models/enums/StatusEvento';
import { diaSemana, formatarData, formatarDataIso, formatarDiaMes, formatarHora, hojeIso, parseDataIso, somarDiasIso } from 'app/utils/data-evento';
import { abrirRota } from 'app/utils/navegar';

// Visão do dia: eventos da data lado a lado, conflitos (membro em 2+ eventos) e membros livres. A data vem em ?data=yyyy-MM-dd
// (o resolver relê a cada mudança da query); navegar só troca a query string.
@Component({
    standalone: true,
    selector: 'visao-do-dia',
    templateUrl: './visao-do-dia.component.html',
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [CommonModule, RouterModule, MatButtonModule, MatDatepickerModule, MatIconModule, MatInputModule],
})
export class VisaoDoDiaComponent implements OnInit, OnDestroy {
    dia?: DiaResponse;
    funcoes = FUNCAO_MEMBRO;
    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;
    statusRotulo = STATUS_EVENTO_ROTULO;
    statusCor = STATUS_EVENTO_COR;
    cancelado = StatusEvento.Cancelado;
    formatarHora = formatarHora;
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _title: Title,
    ) { }

    // Data exibida (Date local) para o datepicker.
    get dataDate(): Date | null {
        return parseDataIso(this.dia?.Data);
    }

    // "Sábado, 15/11/2026".
    get titulo(): string {
        const s = diaSemana(this.dia?.Data);
        return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}, ${formatarData(this.dia?.Data)}` : '';
    }

    get diaMes(): string {
        return formatarDiaMes(this.dia?.Data);
    }

    get ehHoje(): boolean {
        return this.dia?.Data === hojeIso();
    }

    ngOnInit(): void {
        this._title.setTitle('Visão do dia');
        this._route.data.pipe(takeUntil(this._destroy$)).subscribe(data => {
            this.dia = data['data']?.dia;
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    irPara(data: string): void {
        this._router.navigate([], { relativeTo: this._route, queryParams: { data }, queryParamsHandling: 'merge' });
    }

    anterior(): void {
        this.irPara(somarDiasIso(this.dia?.Data ?? hojeIso(), -1));
    }

    proximo(): void {
        this.irPara(somarDiasIso(this.dia?.Data ?? hojeIso(), 1));
    }

    hoje(): void {
        this.irPara(hojeIso());
    }

    aoEscolherData(d: Date | null): void {
        if (d) {
            this.irPara(formatarDataIso(d));
        }
    }

    novoEvento(): void {
        this._router.navigate(['/assinante/eventos/novo'], { queryParams: { data: this.dia?.Data } });
    }

    abrirEvento(e: DiaEventoItem, event?: MouseEvent): void {
        abrirRota(this._router, this._route, ['/assinante/eventos', e.Id], event);
    }

    livresDaFuncao(funcao: number) {
        return (this.dia?.Livres ?? []).filter(l => l.MEM_FUNCAO === funcao);
    }
}
