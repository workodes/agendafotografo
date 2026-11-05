import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { of, switchMap } from 'rxjs';

// Páginas públicas (login, recuperar senha): usuário já logado vai para a página inicial da role.
export const NoAuthGuard: CanActivateFn | CanActivateChildFn = () => {
    const router: Router = inject(Router);
    const authService = inject(AuthService);

    return authService.check().pipe(
        switchMap(authenticated => {
            if (!authenticated)
                return of(true);

            return of(router.parseUrl(authService.getRotaInicial()));
        }),
    );
};
