import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Router } from '@angular/router';
import { PlanoModuloService } from 'app/core/services/plano-modulo.service';
import { ehBloqueioDeModulo, moduloDoBloqueio } from 'app/models/enums/ModuloPlano';

@Injectable({ providedIn: 'root' })
export class AuthorizationErrorHandlerService {
    private fuseConfirmationService = inject(FuseConfirmationService);
    private router = inject(Router);
    private planoModulo = inject(PlanoModuloService);

    private dialogAberto = false;


    handle(error: any): Observable<never> {
        if (!error.error?.bloqueado) // Se bloqueado, deixa o interceptor lidar com isso
            if (error.status === 403 && ehBloqueioDeModulo(error?.error))
                // Plano 24: a carga da tela falhou porque o módulo não está no plano: vai para "não disponível" (Início: Agenda).
                this.router.navigateByUrl(this.planoModulo.Destino(moduloDoBloqueio(error.error)));
            else if (error.status === 403)
                this.showNoPermissionDialog(error?.error);
            else
                this.router.navigate(['generic-error']);

        return throwError(() => error);
    }

    showNoPermissionDialog(message?: string): void {
        if (this.dialogAberto)
            return;

        this.dialogAberto = true;

        this.fuseConfirmationService.open({
            title: 'Não autorizado',
            message: message ?? 'Você não tem permissão para realizar esta ação.',
            icon: {
                show: true,
                name: 'heroicons_outline:exclamation-circle',
                color: 'warning',
            },
            actions: {
                cancel: {
                    show: false,
                },
                confirm: {
                    label: 'Ok',
                    color: 'primary',
                },
            },
            dismissible: true,
        }).afterClosed().subscribe(() => this.dialogAberto = false);
    }
}
