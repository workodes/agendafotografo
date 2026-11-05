import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { cloneDeep } from 'lodash-es';
import { Observable, of, ReplaySubject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MenuData } from './menu.data';

@Injectable({ providedIn: 'root' })
export class NavigationService {
    private _navigation: ReplaySubject<Navigation> = new ReplaySubject<Navigation>(1);
    public menu: FuseNavigationItem[] = [];

    constructor(
        private _authService: AuthService,
        private _menuData: MenuData,
    ) { }

    get navigation$(): Observable<Navigation> {
        return this._navigation.asObservable();
    }

    // Monta o menu conforme a role do token (ver menu.data.ts).
    get(): Observable<Navigation> {
        const role = this._authService.getUserRole();
        this.menu = role ? this._menuData.porRole[role] ?? [] : [];

        const navigation: Navigation = {
            horizontal: cloneDeep(this.menu),
        };

        this._navigation.next(navigation);
        return of(navigation);
    }
}
