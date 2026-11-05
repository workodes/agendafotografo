import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { MembroService } from 'app/services/membro.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Carga inicial da listagem (página 1, só ativos, todas as funções).
export const membroListResolver: ResolveFn<any> = () => {
    const service = inject(MembroService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        lista: service.GetAllPaginated(1, 25, '', 'true'),
    }).pipe(catchError(error => errorHandler.handle(error)));
};

// Ficha de edição.
export const membroDetailsResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(MembroService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        membro: service.Get(route.paramMap.get('id')!),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
