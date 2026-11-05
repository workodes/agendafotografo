import { Injectable } from '@angular/core';
import { Usuario } from 'app/models/entities/Usuario';
import { Observable, ReplaySubject } from 'rxjs';

// Guarda o usuário logado (`usuario$`) durante a sessão.
@Injectable({
    providedIn: 'root'
})
export class UsuarioService {
    private _usuario: ReplaySubject<Usuario> = new ReplaySubject<Usuario>(1);

    set usuario(value: Usuario) {
        this._usuario.next(value);
    }
    get usuario$(): Observable<Usuario> {
        return this._usuario.asObservable();
    }
}
