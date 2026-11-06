import { NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule, RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@fuse/components/loading-bar';
import { FuseHorizontalNavigationComponent, FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AuthService } from 'app/core/auth/auth.service';
import { UsuarioService } from 'app/core/services/usuario.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { AlterarSenhaDialogComponent } from 'app/layout/common/user/alterar-senha-dialog/alterar-senha-dialog.component';
import { InstalarAppComponent } from 'app/layout/common/instalar-app/instalar-app.component';
import { UserComponent } from 'app/layout/common/user/user.component';
import { AvisosComponent } from 'app/layout/common/avisos/avisos.component';
import { BuscaGlobalComponent } from 'app/layout/common/busca-global/busca-global.component';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector     : 'modern-layout',
    templateUrl  : './modern.component.html',
    styleUrls    : ['./modern-component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [FuseLoadingBarComponent, RouterModule, NgIf, FuseVerticalNavigationComponent, FuseHorizontalNavigationComponent, MatButtonModule, MatIconModule, UserComponent, AvisosComponent, BuscaGlobalComponent, InstalarAppComponent, RouterOutlet],
})
export class ModernLayoutComponent implements OnInit, OnDestroy
{
    isScreenSmall: boolean;
    /** A partir de `lg` a busca vira uma caixa no cabeçalho; abaixo disso é só o ícone (barra sobre o cabeçalho). */
    isScreenLarge: boolean;
    navigation: Navigation = { horizontal: [] };
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    /** O modal de troca obrigatória é aberto uma única vez por instância do layout (F5 recria o layout e reabre). */
    private _trocaSenhaAberta = false;

    /**
     * Constructor
     */
    constructor(
        private _navigationService: NavigationService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private authService: AuthService,
        private _usuarioService: UsuarioService,
        private _matDialog: MatDialog,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number
    {
        return new Date().getFullYear();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Troca obrigatória de senha (ExigirTrocaSenha vindo do login/localStorage): abre o modal sem opção de fechar.
        this._usuarioService.usuario$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(usuario => {
                if (usuario?.ExigirTrocaSenha === true && !this._trocaSenhaAberta) {
                    this._trocaSenhaAberta = true;
                    this.abrirTrocaSenhaObrigatoria();
                }
            });

        // Subscribe to navigation data
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) =>
            {
                this.navigation = navigation;
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({matchingAliases}) =>
            {
                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
                this.isScreenLarge = matchingAliases.includes('lg');
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Toggle navigation
     *
     * @param name
     */
    toggleNavigation(name: string): void
    {
        // Get the navigation
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);

        if ( navigation )
        {
            // Toggle the opened status
            navigation.toggle();
        }
    }

    /** Rota da tela inicial da role logada (link real do logo). */
    get rotaInicio(): string {
        return this.authService.getRotaInicial();
    }

    /** Sino de avisos, busca global e "+ Novo evento" são só do Assinante; o Admin mantém o cabeçalho enxuto. */
    get ehAssinante(): boolean {
        return this.authService.getUserRole() === ROLE_NAMES.Assinante;
    }

    private abrirTrocaSenhaObrigatoria(): void {
        this._matDialog.open(AlterarSenhaDialogComponent, {
            width: '380px',
            maxWidth: '95vw',
            autoFocus: 'first-tabbable',
            disableClose: true, // ESC e clique no fundo não fecham
            data: { obrigatorio: true },
        });
    }
}
