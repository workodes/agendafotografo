import { NgClass, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'app/core/auth/auth.service';
import { TesteGratis } from 'app/models/DTOs/responses/TesteGratis';
import { formatarData } from 'app/utils/data-evento';
import { testeEmAlerta, textoTesteCabecalho, textoTesteCurto } from 'app/utils/teste-gratis';

/**
 * Aviso do teste grátis no cabeçalho do assinante. Carrega uma vez ao montar o layout (cada F5);
 * se falhar ou não houver prazo, não mostra nada. Os dias vêm calculados pela API.
 */
@Component({
    selector: 'teste-gratis',
    standalone: true,
    imports: [NgIf, NgClass, MatIconModule, MatTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span *ngIf="completo" role="status" class="inline-flex h-7 max-w-12 items-center justify-center gap-0.5 whitespace-nowrap rounded-full border px-2 text-xs font-semibold leading-none sm:h-auto sm:max-w-none sm:px-3 sm:py-1"
            [ngClass]="alerta ? 'border-amber-300 bg-amber-100 text-amber-900' : 'border-gray-300 text-secondary'"
            [matTooltip]="dica" [attr.aria-label]="completo + (dica ? '. ' + dica : '')">
            <!-- Celular (abaixo de sm): selo compacto com relógio e número; encerrado = alerta -->
            <span class="inline-flex items-center gap-0.5 sm:hidden" aria-hidden="true">
                <mat-icon class="icon-size-4" [svgIcon]="encerrado ? 'heroicons_outline:exclamation-triangle' : 'heroicons_outline:clock'"></mat-icon>
                <span *ngIf="!encerrado">{{ dias }}</span>
            </span>
            <!-- sm até lg (convive com o menu horizontal): texto curto -->
            <span class="hidden sm:inline lg:hidden" aria-hidden="true">{{ curto }}</span>
            <!-- lg ou mais: texto completo -->
            <span class="hidden lg:inline">{{ completo }}</span>
        </span>
    `,
})
export class TesteGratisComponent implements OnInit, OnDestroy {
    completo: string | null = null;
    curto: string | null = null;
    dica = '';
    alerta = false;
    dias = 0;
    encerrado = false;
    private _destroy$ = new Subject<void>();

    constructor(private _auth: AuthService, private _cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        this._auth.TesteGratis().pipe(takeUntil(this._destroy$)).subscribe({
            next: (t: TesteGratis) => {
                this.completo = textoTesteCabecalho(t.DiasRestantes);
                this.curto = textoTesteCurto(t.DiasRestantes);
                this.dias = t.DiasRestantes ?? 0;
                this.encerrado = this.dias <= 0;
                this.alerta = testeEmAlerta(t.DiasRestantes);
                this.dica = t.ASS_TESTE_ATE ? `Teste grátis até ${formatarData(t.ASS_TESTE_ATE)}` : '';
                this._cdr.markForCheck();
            },
            error: () => { /* sem aviso */ },
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }
}
