import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

// Exige usuário autenticado e com uma das roles em data.requiredRoles (procurada na rota e nos pais).
export const AuthGuard: CanActivateFn | CanActivateChildFn = (route, state) => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    return authService.check().pipe(
        switchMap(authenticated => {
            if (!authenticated) {
                const redirectURL = state.url === '/sign-out' ? '' : `redirectURL=${state.url}`;
                return of(router.parseUrl(`sign-in?${redirectURL}`));
            }

            const requiredRoles = getRequiredRoles(route);
            // Role sem acesso a esta área: volta para a página inicial da própria role.
            if (!requiredRoles.includes(authService.getUserRole()))
                return of(router.parseUrl(authService.getRotaInicial()));

            return of(true);
        }),
    );
};

const getRequiredRoles = (route: ActivatedRouteSnapshot): string[] => {
    let current = route;

    while (current) {
        if (current.data?.['requiredRoles'])
            return current.data['requiredRoles'];

        current = current.parent!;
    }

    return [];
};
