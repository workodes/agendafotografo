import { NgClass, NgIf } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';
import { FuseLoadingBarComponent } from '@fuse/components/loading-bar';
import { FuseHorizontalNavigationComponent, FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AuthService } from 'app/core/auth/auth.service';
import { UsuarioService } from 'app/core/services/usuario.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { Navigation } from 'app/core/navigation/navigation.types';
import { AlterarSenhaDialogComponent } from 'app/layout/common/user/alterar-senha-dialog/alterar-senha-dialog.component';
import { TesteGratisComponent } from 'app/layout/common/teste-gratis/teste-gratis.component';
import { UserComponent } from 'app/layout/common/user/user.component';
import { AssistenteComponent } from 'app/layout/common/assistente/assistente.component';
import { ChatService } from 'app/services/chat.service';
import { AvisosComponent } from 'app/layout/common/avisos/avisos.component';
import { BuscaGlobalComponent } from 'app/layout/common/busca-global/busca-global.component';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { ROLE_NAMES } from 'app/core/constants/RoleNames';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
    selector     : 'modern-layout',
    templateUrl  : './modern.component.html',
    styleUrls    : ['./modern-component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone   : true,
    imports      : [FuseLoadingBarComponent, RouterModule, NgIf, NgClass, AssistenteComponent, FuseVerticalNavigationComponent, FuseHorizontalNavigationComponent, MatButtonModule, MatIconModule, UserComponent, TesteGratisComponent, AvisosComponent, BuscaGlobalComponent, RouterOutlet, FecharComEscDirective],
})
export class ModernLayoutComponent implements OnInit, OnDestroy
{
    isScreenSmall: boolean;
    /** A partir de `lg` a busca vira uma caixa no cabeçalho; abaixo disso é só o ícone (barra sobre o cabeçalho). */
    isScreenLarge: boolean;
    /** Assistente com IA: só para o Assinante, e só quando a API informa que o chat está ligado. */
    assistenteVisivel = false;
    navigation: Navigation = { horizontal: [] };
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    /** O modal de troca obrigatória é aberto uma única vez por instância do layout (F5 recria o layout e reabre). */
    private _trocaSenhaAberta = false;
    /** Id do item pai (ex.: Cadastros) cuja rota filha está ativa; só ele recebe a classe `pai-ativo-item` no wrapper. */
    private _paiAtivoId: string | null = null;
    private _menuOriginal: Navigation['horizontal'] = [];

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
        private _router: Router,
        private _chatService: ChatService,
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
                if (usuario?.ExigirTrocaSenha === true && usuario?.TemSenha !== false && !this._trocaSenhaAberta) {
                    this._trocaSenhaAberta = true;
                    this.abrirTrocaSenhaObrigatoria();
                }
            });

        // Assistente: consulta o status uma vez ao montar o layout do Assinante (falha = desligado).
        if (this.ehAssinante)
        {
            this._chatService.status$
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(status => (this.assistenteVisivel = status?.Ligado === true));
            this._chatService.CarregarStatus();
        }

        // Subscribe to navigation data
        this._navigationService.navigation$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((navigation: Navigation) =>
            {
                this._menuOriginal = navigation.horizontal ?? [];
                this._paiAtivoId = null;
                this.atualizarPaiAtivo(true);
            });

        this._router.events
            .pipe(filter(e => e instanceof NavigationEnd), takeUntil(this._unsubscribeAll))
            .subscribe(() => this.atualizarPaiAtivo());

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

    /** ESC fecha a gaveta do menu (celular), se estiver aberta. */
    fecharGaveta(): void {
        const nav = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>('mainNavigation');
        if (nav?.opened) {
            nav.close();
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

    private atualizarPaiAtivo(forcar = false): void {
        const url = this._router.url.split(/[?#]/)[0];
        const ativo = this._menuOriginal.find(item =>
            (item.children ?? []).some(f => !!f.link && (url === f.link || url.startsWith(f.link + '/'))))?.id ?? null;
        if (!forcar && ativo === this._paiAtivoId) {
            return;
        }
        this._paiAtivoId = ativo;
        // Novo array (o menu é OnPush): só o pai ativo ganha a classe de destaque.
        this.navigation = {
            ...this.navigation,
            horizontal: this._menuOriginal.map(item => item.id === ativo
                ? { ...item, classes: { ...item.classes, wrapper: 'pai-ativo-item' } }
                : item),
        };
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
