import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { PendenciaModeloService } from 'app/services/pendencia-modelo.service';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Carga inicial da listagem (página 1, só ativos) e as opções do filtro de tipo de evento (inclui inativos, para filtrar o histórico).
export const pendenciaModeloListResolver: ResolveFn<any> = () => {
    const service = inject(PendenciaModeloService);
    const tipoService = inject(TipoEventoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        lista: service.GetAllPaginated(1, 25, '', 'ativos'),
        tipos: tipoService.Opcoes(false),
    }).pipe(catchError(error => errorHandler.handle(error)));
};

// Ficha (novo ou edição): modelo (só na edição) e tipos de evento ativos. O tipo inativo já gravado no modelo entra no combo, marcado "(inativo)".
export const pendenciaModeloFichaResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(PendenciaModeloService);
    const tipoService = inject(TipoEventoService);
    const errorHandler = inject(AuthorizationErrorHandlerService);
    const id = route.paramMap.get('id');

    if (!id) {
        return forkJoin({
            modelo: of(null),
            tipos: tipoService.Opcoes(true),
        }).pipe(catchError(error => errorHandler.handle(error)));
    }

    return service.Get(id).pipe(
        switchMap(modelo => forkJoin({
            modelo: of(modelo),
            ativos: tipoService.Opcoes(true),
            comGravado: tipoService.Opcoes(true, modelo.PEM_TIPO_EVENTO_ID),
        }).pipe(
            map(({ modelo: m, ativos, comGravado }) => {
                const idsAtivos = new Set(ativos.map(a => a.Id));
                const tipos: Opcao[] = comGravado.map(t => idsAtivos.has(t.Id) ? t : { ...t, Nome: `${t.Nome} (inativo)` });
                return { modelo: m, tipos };
            }),
        )),
        catchError(error => errorHandler.handle(error)),
    );
};
