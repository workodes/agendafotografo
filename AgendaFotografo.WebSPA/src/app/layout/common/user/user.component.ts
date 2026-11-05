import { BooleanInput } from '@angular/cdk/coercion';
import { NgIf, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { UsuarioService } from 'app/core/services/usuario.service';
import { Usuario } from 'app/models/entities/Usuario';
import { Subject, takeUntil } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule, ReactiveFormsModule, UntypedFormGroup, } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AlterarSenhaDialogComponent } from './alterar-senha-dialog/alterar-senha-dialog.component';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'user',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule,
        MatTooltipModule,
        MatFormFieldModule,
        ReactiveFormsModule,
        MatMenuModule,
        NgIf,
        MatIconModule,
        MatDividerModule],
})
export class UserComponent implements OnInit, OnDestroy {
    static ngAcceptInputType_showAvatar: BooleanInput;
    private A;

    logo: string;

    @Input() showAvatar: boolean = true;
    usuario: Usuario;

    private _unsubscribeAll: Subject<any> = new Subject<any>();

    resetPasswordForm: UntypedFormGroup;
    /**
     * Constructor
     */
    constructor(
        private _matDialog: MatDialog,
        private _changeDetectorRef: ChangeDetectorRef,
        private _router: Router,
        private _usuarioService: UsuarioService,
    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------
    ngOnInit(): void {
        this._usuarioService.usuario$.pipe(takeUntil(this._unsubscribeAll))
            .subscribe(usuario => {
                this.usuario = usuario;
                this._changeDetectorRef.markForCheck();
            }
            );
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    /**
     * Sign out
     */
    signOut(): void {
        // this._router.navigate(['/sign-out']);
        this._router.navigateByUrl('sign-out')
    }

    /**
     * Abre o modal de alterar senha
     */
    alterarSenha(): void {
        this._matDialog.open(AlterarSenhaDialogComponent, {
            width: '380px',
            maxWidth: '95vw',
            autoFocus: 'first-tabbable',
        });
    }
}
