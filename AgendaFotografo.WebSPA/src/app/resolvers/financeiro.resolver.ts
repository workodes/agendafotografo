import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of } from 'rxjs';
import { GastoFixoService } from 'app/services/gasto-fixo.service';

// Ao abrir o Financeiro (F5 ou entrada pelo menu), gera os lançamentos de Despesa dos gastos fixos que faltam (POST sem corpo,
// idempotente). Falha não bloqueia a tela: avisa e segue. Devolve a quantidade gerada para o componente pai.
export const financeiroResolver: ResolveFn<number> = () => {
    const snackBar = inject(MatSnackBar);

    return inject(GastoFixoService).GerarLancamentos().pipe(
        map(resp => {
            const gerados = resp?.Gerados ?? 0;
            if (gerados > 0) {
                snackBar.open(`${gerados} ${gerados === 1 ? 'lançamento' : 'lançamentos'} de gastos fixos ${gerados === 1 ? 'adicionado' : 'adicionados'}.`, 'X', { duration: 6000 });
            }
            return gerados;
        }),
        catchError(() => {
            snackBar.open('Não foi possível atualizar os gastos fixos.', 'X', { duration: 6000 });
            return of(0);
        }),
    );
};
