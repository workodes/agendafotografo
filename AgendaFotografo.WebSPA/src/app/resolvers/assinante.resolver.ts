import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { AssinanteService } from 'app/services/assinante.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Carga inicial da listagem (página 1, só ativos).
export const assinanteListResolver: ResolveFn<any> = () => {
    const service = inject(AssinanteService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        lista: service.GetAllPaginated(1, 25, '', 'true'),
    }).pipe(catchError(error => errorHandler.handle(error)));
};

// Ficha de edição.
export const assinanteDetailsResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(AssinanteService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        assinante: service.Get(route.paramMap.get('id')!),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
