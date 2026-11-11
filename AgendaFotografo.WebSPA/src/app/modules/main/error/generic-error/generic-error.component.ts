import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { MascoteComponent } from 'app/shared/auth-shell/mascote.component';
import { QcAuthShellComponent } from 'app/shared/auth-shell/qc-auth-shell.component';

// Página de erro genérico (rota /generic-error). É o destino dos resolvers e do AuthorizationErrorHandlerService
// quando a carga de uma tela falha (rede, 404, 500). Fica fora do layout autenticado, como a 404.
@Component({
    standalone: true,
    selector: 'generic-error',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, QcAuthShellComponent, MascoteComponent],
    template: `
        <app-qc-auth-shell titulo="Algo deu errado" [mostrarMascote]="false"
            subtitulo="Não foi possível carregar esta tela agora. Tente novamente em instantes; se o problema continuar, procure o administrador do sistema.">
            <div class="text-center">
                <app-mascote tamanho="grande" />
                <a class="qc-btn qc-btn-primario mt-6" [routerLink]="rotaInicial">
                    {{ logado ? 'Voltar ao início' : 'Ir para o login' }}
                </a>
            </div>
        </app-qc-auth-shell>
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
