import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, ResolveFn } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { EventoService } from 'app/services/evento.service';
import { OrganizadorService } from 'app/services/organizador.service';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Ficha do evento (página inteira). Em `novo` (sem :id) devolve só as opções de tipo e organizador;
// na edição traz também o evento e a escala. Tipo e organizador inativos já gravados no evento entram no combo (incluirId).
export const eventoFichaResolver: ResolveFn<any> = (route: ActivatedRouteSnapshot) => {
    const service = inject(EventoService);
    const tipoService = inject(TipoEventoService);
    const organizadorService = inject(OrganizadorService);
    const errorHandler = inject(AuthorizationErrorHandlerService);
    const id = route.paramMap.get('id');

    if (!id) {
        return forkJoin({
            evento: of(null),
            equipe: of([]),
            pendencias: of([]),
            tipos: tipoService.Opcoes(true),
            organizadores: organizadorService.Opcoes(true),
        }).pipe(catchError(error => errorHandler.handle(error)));
    }

    return service.Get(id).pipe(
        switchMap(evento => forkJoin({
            evento: of(evento),
            equipe: service.Membros(id),
            pendencias: service.Pendencias(id),
            tipos: tipoService.Opcoes(true, evento.EVE_TIPO_EVENTO_ID),
            organizadores: organizadorService.Opcoes(true, evento.EVE_ORGANIZADOR_ID),
        })),
        catchError(error => errorHandler.handle(error)),
    );
};

// Visão do dia: lê ?data=yyyy-MM-dd (sem data ou inválida = hoje).

