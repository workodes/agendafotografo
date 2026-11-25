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
import { DefinirSenhaDialogComponent } from './definir-senha-dialog/definir-senha-dialog.component';
import { AuthService } from 'app/core/auth/auth.service';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { TesteGratis } from 'app/models/DTOs/responses/TesteGratis';
import { formatarData } from 'app/utils/data-evento';
import { testeEmAlerta, textoTesteCabecalho } from 'app/utils/teste-gratis';
import { AlterarSenhaDialogComponent } from './alterar-senha-dialog/alterar-senha-dialog.component';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'flex items-center' },
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

    /** Aviso do teste grátis (só Assinante; o Fotógrafo é grátis e não tem teste, plano 21). Nulo = não mostra. */
    testeTexto: string | null = null;
    testeDica = '';
    testeAlerta = false;
    /**
     * Constructor
     */
    constructor(
        private _matDialog: MatDialog,
        private _changeDetectorRef: ChangeDetectorRef,
        private _router: Router,
        private _usuarioService: UsuarioService,
        private _auth: AuthService,
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

        if (this._auth.getUserRole() === ROLE_NAMES.Assinante) {
            this._auth.TesteGratis().pipe(takeUntil(this._unsubscribeAll)).subscribe({
                next: (t: TesteGratis) => {
                    this.testeTexto = textoTesteCabecalho(t.DiasRestantes);
                    this.testeAlerta = testeEmAlerta(t.DiasRestantes);
                    this.testeDica = t.ASS_TESTE_ATE ? `Até ${formatarData(t.ASS_TESTE_ATE)}` : '';
                    this._changeDetectorRef.markForCheck();
                },
                error: () => { /* sem aviso */ },
            });
        }
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

    /**
     * Abre o modal de definir senha (conta criada só com o Google).
     */
    definirSenha(): void {
        this._matDialog.open(DefinirSenhaDialogComponent, {
            width: '440px',
            maxWidth: '95vw',
            autoFocus: 'first-tabbable',
        });
    }
}
