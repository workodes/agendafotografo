import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { PlanoService } from 'app/services/plano.service';
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

// Novo assinante (plano 24): opções de plano (só os ativos) para o select; a primeira opção da tela é "Padrão do autocadastro".
export const assinanteNovoResolver: ResolveFn<any> = () => {
    const planoService = inject(PlanoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        planos: planoService.Opcoes(true),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
