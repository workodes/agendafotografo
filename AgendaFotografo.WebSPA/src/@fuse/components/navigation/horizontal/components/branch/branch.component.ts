import { BooleanInput } from '@angular/cdk/coercion';
import { NgClass, NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, forwardRef, Input, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenu, MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseHorizontalNavigationBasicItemComponent } from '@fuse/components/navigation/horizontal/components/basic/basic.component';
import { FuseHorizontalNavigationDividerItemComponent } from '@fuse/components/navigation/horizontal/components/divider/divider.component';
import { FuseHorizontalNavigationComponent } from '@fuse/components/navigation/horizontal/horizontal.component';
import { FuseNavigationService } from '@fuse/components/navigation/navigation.service';
import { FuseNavigationItem } from '@fuse/components/navigation/navigation.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector       : 'fuse-horizontal-navigation-branch-item',
    templateUrl    : './branch.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone     : true,
    imports        : [NgIf, NgClass, MatMenuModule, NgTemplateOutlet, NgFor, FuseHorizontalNavigationBasicItemComponent, forwardRef(() => FuseHorizontalNavigationBranchItemComponent), FuseHorizontalNavigationDividerItemComponent, MatTooltipModule, MatIconModule],
})
export class FuseHorizontalNavigationBranchItemComponent implements OnInit, OnDestroy
{
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_child: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() child: boolean = false;
    @Input() item: FuseNavigationItem;
    @Input() name: string;
    @ViewChild('matMenu', {static: true}) matMenu: MatMenu;

    private _fuseHorizontalNavigationComponent: FuseHorizontalNavigationComponent;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    // Abertura por hover (só itens de primeiro nível, só mouse; toque e teclado seguem o clique do Material).
    private static _atual: FuseHorizontalNavigationBranchItemComponent | null = null;
    private static readonly ATRASO_ABRIR = 120;
    private static readonly ATRASO_FECHAR = 220;
    private _trigger?: MatMenuTrigger;
    private _elTrigger?: HTMLElement;
    private _abertoPorHover = false;
    private _fechando = false;
    private _timerAbrir?: ReturnType<typeof setTimeout>;
    private _timerFechar?: ReturnType<typeof setTimeout>;
    private _removerOuvintes?: () => void;

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseNavigationService: FuseNavigationService,
        private _ngZone: NgZone,
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void
    {
        // Get the parent navigation component
        this._fuseHorizontalNavigationComponent = this._fuseNavigationService.getComponent(this.name);

        // Subscribe to onRefreshed on the navigation component
        this._fuseHorizontalNavigationComponent.onRefreshed.pipe(
            takeUntil(this._unsubscribeAll),
        ).subscribe(() =>
        {
            // Mark for check
            this._changeDetectorRef.markForCheck();
        });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void
    {
        this.limparTimers();
        this._removerOuvintes?.();
        if (FuseHorizontalNavigationBranchItemComponent._atual === this)
        {
            FuseHorizontalNavigationBranchItemComponent._atual = null;
        }
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Mouse entrou no item de primeiro nível: abre o submenu após um pequeno atraso.
     */
    aoEntrar(event: PointerEvent, trigger: MatMenuTrigger): void
    {
        if (event.pointerType !== 'mouse')
        {
            return;
        }
        this._trigger = trigger;
        this._elTrigger = event.currentTarget as HTMLElement;
        clearTimeout(this._timerFechar);
        this._fechando = false;
        if (trigger.menuOpen)
        {
            return;
        }
        clearTimeout(this._timerAbrir);
        this._timerAbrir = setTimeout(() =>
        {
            // Fecha o submenu de outro item antes de abrir este.
            FuseHorizontalNavigationBranchItemComponent._atual?.fecharAgora();
            this._abertoPorHover = true;
            trigger.openMenu();
        }, FuseHorizontalNavigationBranchItemComponent.ATRASO_ABRIR);
    }

    /**
     * Submenu abriu (por hover, clique ou teclado).
     */
    aoAbrir(trigger: MatMenuTrigger, raiz: HTMLElement): void
    {
        this._trigger = trigger;
        this._elTrigger = raiz;
        const atual = FuseHorizontalNavigationBranchItemComponent._atual;
        if (atual && atual !== this)
        {
            atual.fecharAgora();
        }
        FuseHorizontalNavigationBranchItemComponent._atual = this;
        this.registrarOuvintes();
        this.triggerChangeDetection();
    }

    /**
     * Submenu fechou: limpa timers e ouvintes.
     */
    aoFechar(): void
    {
        this.limparTimers();
        this._abertoPorHover = false;
        this._removerOuvintes?.();
        this._removerOuvintes = undefined;
        if (FuseHorizontalNavigationBranchItemComponent._atual === this)
        {
            FuseHorizontalNavigationBranchItemComponent._atual = null;
        }
        this.triggerChangeDetection();
    }

    /**
     * Fecha sem atraso (troca de item ou clique fora).
     */
    fecharAgora(): void
    {
        this.limparTimers();
        this._ngZone.run(() => this._trigger?.closeMenu());
    }

    /**
     * Enquanto aberto: o mouse sobre o item ou sobre qualquer painel de menu cancela o fechamento; fora deles agenda o
     * fechamento (só se abriu por hover). Clique fora fecha sempre (o painel de primeiro nível não tem backdrop).
     */
    private registrarOuvintes(): void
    {
        this._removerOuvintes?.();
        const dentro = (alvo: EventTarget | null): boolean =>
        {
            const n = alvo as Element | null;
            return !!n && !!n.closest && (!!this._elTrigger && this._elTrigger.contains(n) || !!n.closest('.mat-mdc-menu-panel'));
        };
        const aoMover = (e: PointerEvent): void =>
        {
            if (e.pointerType !== 'mouse' || !this._abertoPorHover)
            {
                return;
            }
            if (dentro(e.target))
            {
                clearTimeout(this._timerFechar);
                this._fechando = false;
            }
            else if (!this._fechando)
            {
                this._fechando = true;
                this._timerFechar = setTimeout(() => this.fecharAgora(), FuseHorizontalNavigationBranchItemComponent.ATRASO_FECHAR);
            }
        };
        const aoClicar = (e: MouseEvent): void =>
        {
            if (!dentro(e.target))
            {
                this.fecharAgora();
            }
        };
        // Clique no item pai logo após abrir por hover: mantém aberto (o próximo clique fecha pelo Material).
        const capturarClique = (e: MouseEvent): void =>
        {
            if (this._abertoPorHover && this._trigger?.menuOpen)
            {
                e.stopImmediatePropagation();
                this._abertoPorHover = false;
                clearTimeout(this._timerFechar);
                this._fechando = false;
            }
        };
        this._ngZone.runOutsideAngular(() =>
        {
            document.addEventListener('pointerover', aoMover);
            document.addEventListener('click', aoClicar);
            this._elTrigger?.addEventListener('click', capturarClique, true);
        });
        this._removerOuvintes = (): void =>
        {
            document.removeEventListener('pointerover', aoMover);
            document.removeEventListener('click', aoClicar);
            this._elTrigger?.removeEventListener('click', capturarClique, true);
        };
    }

    private limparTimers(): void
    {
        clearTimeout(this._timerAbrir);
        clearTimeout(this._timerFechar);
        this._fechando = false;
    }

    /**
     * Trigger the change detection
     */
    triggerChangeDetection(): void
    {
        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
     * Track by function for ngFor loops
     *
     * @param index
     * @param item
     */
    trackByFn(index: number, item: any): any
    {
        return item.id || index;
    }
}
