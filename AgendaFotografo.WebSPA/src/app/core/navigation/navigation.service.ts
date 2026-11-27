import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { cloneDeep } from 'lodash-es';
import { Observable, of, ReplaySubject } from 'rxjs';
import { ModuloPlano } from 'app/models/enums/ModuloPlano';
import { AuthService } from '../auth/auth.service';
import { ROLE_NAMES } from '../constants/RoleNames';
import { PlanoModuloService } from '../services/plano-modulo.service';
import { MenuData } from './menu.data';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private _navigation: ReplaySubject<Navigation> = new ReplaySubject<Navigation>(1);
    public menu: FuseNavigationItem[] = [];

    constructor(
        private _authService: AuthService,
        private _menuData: MenuData,
        private _planoModulo: PlanoModuloService,
    ) {
        // Plano 24: os módulos mudaram (login, F5 ou depois de um 403): remonta o menu sem novo login.
        this._planoModulo.alterado$.subscribe(() => {
            if (this._authService.getUserRole())
                this.get();
        });
    }

    get navigation$(): Observable<Navigation> {
        return this._navigation.asObservable();
    }

    // Monta o menu conforme a role do token (ver menu.data.ts).
    get(): Observable<Navigation> {
        const role = this._authService.getUserRole();
        const menu = role ? this._menuData.porRole[role] ?? [] : [];
        // Plano 24: o Assinante só vê os itens dos módulos liberados (item com `meta.modulo`); grupo que fica vazio some.
        this.menu = role === ROLE_NAMES.Assinante ? this.filtrarPorModulo(menu) : menu;

        const navigation: Navigation = {
            horizontal: cloneDeep(this.menu),
        };

        this._navigation.next(navigation);
        return of(navigation);
    }

    private filtrarPorModulo(itens: FuseNavigationItem[]): FuseNavigationItem[] {
        return itens
            .filter(item => {
                const modulo = item.meta?.modulo as ModuloPlano | undefined;
                return !modulo || this._planoModulo.Liberado(modulo);
            })
            .map(item => item.children ? { ...item, children: this.filtrarPorModulo(item.children) } : item)
            .filter(item => !item.children || item.children.length > 0);
    }
}
