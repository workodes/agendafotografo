import { OverlayContainer } from '@angular/cdk/overlay';
import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { PlanoModuloService } from 'app/core/services/plano-modulo.service';
import { environment } from 'environments/environment';
import { AuthorizationErrorHandlerService } from 'app/services/utils/authorization-error-handler.service';
import { catchError, Observable, throwError } from 'rxjs';

/**
 * Intercept
 *
 * @param req
 * @param next
 */
export const authInterceptor = (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const errorHandler = inject(AuthorizationErrorHandlerService);
    const planoModulo = inject(PlanoModuloService);

    // Clone the request object
    let newReq = req.clone();

    // Só trata 401 quando havia sessão: endpoints anônimos (login, link público /e/:token) não derrubam nem recarregam a página.
    const tinhaSessao = !!authService.accessToken;

    // Request
    //
    // If the access token didn't expire, add the Authorization header.
    // We won't add the Authorization header if the access token expired.
    // This will force the server to return a "401 Unauthorized" response
    // for the protected API routes which our response interceptor will
    // catch and delete the access token from the local storage while logging
    // the user out from the app.
    if (authService.accessToken && !AuthUtils.isTokenExpired(authService.accessToken)) {

        newReq = req.clone({
            headers: req.headers.set('Authorization', 'Bearer ' + authService.accessToken),
        });
    }

    // Response
    return next(newReq).pipe(
        catchError(error => {

            if (error instanceof HttpErrorResponse)
                // 401 = sessão derrubada pela API (usuário/assinante inativo, role alterada, token expirado): o reload cai no AuthGuard.
                if (error.status === 401 && tinhaSessao) {
                    authService.signOut();
                    location.reload(); // sem token, o AuthGuard manda para /sign-in
                } else if (error.status === 403 && error.error?.bloqueado) {
                    authService.signOut();
                    router.navigate(['/']);
                    errorHandler.showNoPermissionDialog(error.error?.mensagem ?? 'O usuário está bloqueado.');
                } else if (error.status === 403 && tinhaSessao && !req.url.startsWith(environment.Auth.modulos)
                    && authService.getUserRole() === ROLE_NAMES.Assinante) {
                    // Plano 24: 403 de um Assinante (módulo fora do plano): recarrega os módulos (o menu se atualiza) e, se o módulo da
                    // tela aberta ficou bloqueado, vai para "não disponível". A mensagem da API continua indo ao snackbar de quem chamou.
                    // Auth/Modulos fica de fora para não entrar em laço.
                    planoModulo.ReagirAoBloqueio();
                }

            return throwError(error);
        }),
    );
};
