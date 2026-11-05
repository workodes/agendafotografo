import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Carga inicial da listagem (página 1, só ativos).
export const tipoEventoListResolver: ResolveFn<any> = () => {
    const service = inject(TipoEventoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        lista: service.GetAllPaginated(1, 25, '', 'true'),
    }).pipe(catchError(error => errorHandler.handle(error)));
};

// Ficha de edição.
export const tipoEventoDetailsResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(TipoEventoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        tipoEvento: service.Get(route.paramMap.get('id')!),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
