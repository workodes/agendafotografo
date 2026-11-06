import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { catchError, forkJoin } from 'rxjs';
import { MembroService } from 'app/services/membro.service';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';

// Opções do filtro de responsável da tela Pendências. Inclui os membros inativos (somenteAtivos = false) para filtrar o histórico.
// As pendências NÃO vêm daqui: o componente as carrega quando os filtros ou a página mudam.
export const pendenciaOpcoesResolver: ResolveFn<any> = () => {
    const errorHandler = inject(AuthorizationErrorHandlerService);

    return forkJoin({
        membros: inject(MembroService).Opcoes(false),
    }).pipe(catchError(error => errorHandler.handle(error)));
};
