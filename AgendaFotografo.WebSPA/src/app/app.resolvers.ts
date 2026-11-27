import { inject } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { PlanoModuloService } from 'app/core/services/plano-modulo.service';
import { switchMap } from 'rxjs';

// Dados necessários antes de renderizar qualquer rota protegida: o menu da role logada.
// Plano 24: para o Assinante, os módulos do plano são carregados antes (uma vez por página), porque o menu esconde os não liberados.
export const initialDataResolver = () => {
    const navigation = inject(NavigationService);
    if (inject(AuthService).getUserRole() !== ROLE_NAMES.Assinante)
        return navigation.get();
    return inject(PlanoModuloService).GarantirCarregado().pipe(switchMap(() => navigation.get()));
};
