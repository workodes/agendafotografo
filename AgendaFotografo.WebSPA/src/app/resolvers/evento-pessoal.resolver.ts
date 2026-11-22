import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { EventoPessoalService } from 'app/services/evento-pessoal.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Ficha do evento pessoal: em `novo` (sem :id) não carrega nada; na edição traz o evento.
export const eventoPessoalFichaResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(EventoPessoalService);
    const errorHandler = inject(AuthorizationErrorHandlerService);
    const id = route.paramMap.get('id');

    if (!id) {
        return of({ evento: null });
    }
    return service.Get(id).pipe(
        map(evento => ({ evento })),
        catchError(error => errorHandler.handle(error)),
    );
};
