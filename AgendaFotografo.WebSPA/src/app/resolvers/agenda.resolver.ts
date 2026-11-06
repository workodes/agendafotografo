import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { EventoService } from 'app/services/evento.service';
import { MembroService } from 'app/services/membro.service';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Opções dos filtros da Agenda. Tipo e membro incluem os inativos (somenteAtivos = false) para filtrar também o histórico.
// Os eventos NÃO vêm daqui: o componente os carrega quando o mês ou os filtros mudam.
export const agendaOpcoesResolver: ResolveFn<any> = () => {
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        tipos: inject(TipoEventoService).Opcoes(false),
        membros: inject(MembroService).Opcoes(false),
        cidades: inject(EventoService).Cidades(),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
