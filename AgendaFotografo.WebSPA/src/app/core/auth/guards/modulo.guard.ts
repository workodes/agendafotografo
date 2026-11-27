import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { PlanoModuloService } from 'app/core/services/plano-modulo.service';
import { ModuloPlano } from 'app/models/enums/ModuloPlano';
import { map, of } from 'rxjs';

// Plano 24: rota de um módulo do plano (`data.modulo`). Carrega os módulos uma vez por página e, se o módulo não estiver liberado,
// redireciona: Início -> /assinante/agenda; os demais -> /assinante/nao-disponivel?modulo=N. Só vale para o Assinante
// (as outras roles já são barradas pelo AuthGuard). É conforto de tela: a API devolve 403 de qualquer forma.
export const ModuloGuard: CanActivateFn = route => {
    const modulo = route.data?.['modulo'] as ModuloPlano | undefined;
    const authService = inject(AuthService);
    const planoModulo = inject(PlanoModuloService);

    if (!modulo || authService.getUserRole() !== ROLE_NAMES.Assinante)
        return of(true);

    return planoModulo.GarantirCarregado().pipe(
        map(() => planoModulo.Liberado(modulo) ? true : planoModulo.Destino(modulo)),
    );
};
