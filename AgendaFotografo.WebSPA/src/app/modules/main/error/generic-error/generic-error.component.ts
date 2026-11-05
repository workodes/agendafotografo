import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';

// Página de erro genérico (rota /generic-error). É o destino dos resolvers e do AuthorizationErrorHandlerService
// quando a carga de uma tela falha (rede, 404, 500). Fica fora do layout autenticado, como a 404.
@Component({
    standalone: true,
    selector: 'generic-error',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, MatButtonModule, MatIconModule],
    template: `
        <div class="absolute inset-0">
            <div class="flex flex-col flex-auto items-center justify-center h-full p-6 sm:p-10">
                <mat-icon class="icon-size-20 text-warn" svgIcon="heroicons_outline:exclamation-triangle"></mat-icon>
                <div class="mt-8 text-3xl md:text-6xl font-extrabold tracking-tight leading-tight md:leading-none text-center">Algo deu errado</div>
                <div class="mt-2 text-lg md:text-xl font-medium tracking-tight text-center text-secondary max-w-xl">
                    Não foi possível carregar esta tela agora. Tente novamente em instantes; se o problema continuar, procure o administrador do sistema.
                </div>
                <a mat-flat-button color="primary" class="mt-10" [routerLink]="rotaInicial">
                    {{ logado ? 'Voltar ao início' : 'Ir para o login' }}
                </a>
            </div>
        </div>
    `,
})
export class GenericErrorComponent {
    // Rota inicial conforme o perfil (/admin/inicio ou /assinante/inicio); sem sessão, o login.
    readonly rotaInicial: string;
    readonly logado: boolean;

    constructor(authService: AuthService) {
        this.rotaInicial = authService.getRotaInicial();
        this.logado = this.rotaInicial !== '/sign-in';
    }
}
