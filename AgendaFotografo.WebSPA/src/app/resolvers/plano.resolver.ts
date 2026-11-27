import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { PlanoService } from 'app/services/plano.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Carga inicial da listagem de planos (página 1, todos) e o catálogo (total de módulos para o "N de M").
export const planoListResolver: ResolveFn<any> = () => {
    const service = inject(PlanoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        lista: service.GetAllPaginated(1, 25, '', 'todos'),
        catalogo: service.Modulos(),
    }).pipe(catchError(error => errorHandler.handle(error)));
};

// Ficha do plano: o catálogo de módulos sempre; o plano só na edição (`:id`).
export const planoDetailsResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(PlanoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);
    const id = route.paramMap.get('id');

    return forkJoin({
        catalogo: service.Modulos(),
        plano: id ? service.Get(id) : of(null),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
