import { inject, Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthorizationErrorHandlerService {
    private fuseConfirmationService = inject(FuseConfirmationService);
    private router = inject(Router);

    private dialogAberto = false;


    handle(error: any): Observable<never> {
        if (!error.error?.bloqueado) // Se bloqueado, deixa o interceptor lidar com isso
            if (error.status === 403)
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
