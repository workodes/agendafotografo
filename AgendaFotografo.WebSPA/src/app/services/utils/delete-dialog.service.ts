import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ApiResponse } from 'app/models/ApiResponse';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root',
})
export class DeleteDialogService {
    private dialog = inject(FuseConfirmationService);
    private snackBar = inject(MatSnackBar);

    confirmDelete({
        title = 'Confirmar exclusão',
        message = 'Tem certeza que deseja excluir este registro?',
        action,
        onSuccess,
    }: {
        title?: string;
        message?: string;
        action: () => Observable<ApiResponse>;
        onSuccess: (response: ApiResponse) => void;
    }) {
        const confirmation = this.dialog.open({
            title,
            message,
            icon: {
                show: true,
                name: 'heroicons_outline:exclamation-triangle',
                color: 'warn',
            },
            actions: {
                cancel: { label: 'Cancelar' },
                confirm: {
                    label: "Excluir",
                    color: 'warn',
                },
            },
            dismissible: true,
        });

        confirmation.afterClosed().subscribe(result => {
            if (result !== 'confirmed')
                return;

            action().subscribe({
                next: response => {
                    onSuccess(response);
                    this.snackBar.open(response.Message, 'X', {
                        duration: 5000,
                        panelClass: ['mat-toolbar', 'primary'],
                    });
                },
                error: (error) => this.handleError(error),
            });
        });
    }

    private handleError(error: any) {
        const message = error?.error || error?.error?.message || 'Ocorreu um erro ao realizar a exclusão.';

        if (error?.status === 403) {
            this.showNoPermissionDialog(message);
            return;
        }

        this.dialog.open({
            title: 'Erro',
            message,
            icon: {
                show: true,
                name: 'heroicons_outline:x-mark',
                color: 'warn',
            },
            actions: {
                cancel: { show: false },
                confirm: {
                    label: 'Fechar',
                    color: 'primary',
                },
            },
            dismissible: true,
        });
    }


    private showNoPermissionDialog(message?: string) {
        this.dialog.open({
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
        });
    }
}