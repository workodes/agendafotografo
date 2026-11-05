import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Assinante } from 'app/models/entities/Assinante';
import { AssinanteListItem } from 'app/models/DTOs/responses/AssinanteListItem';
import { AssinanteSenhaTemporaria } from 'app/models/DTOs/responses/AssinanteSenhaTemporaria';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class AssinanteService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um assinante é criado/atualizado/bloqueado/reativado (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'true' (ativos), 'false' (bloqueados) ou 'todos'
    GetAllPaginated(page: number, pageSize: number, busca: string, ativo: string): Observable<PaginatedResponse<AssinanteListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        return this._httpClient.get<PaginatedResponse<AssinanteListItem>>(environment.Assinante.listar, { params });
    }

    Get(id: string): Observable<Assinante> {
        return this._httpClient.get<Assinante>(environment.Assinante.obter, { params: new HttpParams().set('id', id) });
    }

    Add(assinante: Assinante): Observable<AssinanteSenhaTemporaria> {
        return this._httpClient.post<AssinanteSenhaTemporaria>(environment.Assinante.criar, assinante, { headers: this._headers });
    }

    Update(assinante: Assinante): Observable<Assinante> {
        return this._httpClient.put<Assinante>(environment.Assinante.atualizar, assinante, { headers: this._headers });
    }

    // No SPA: "Bloquear".
    Inativar(id: string): Observable<Assinante> {
        return this._httpClient.post<Assinante>(environment.Assinante.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<Assinante> {
        return this._httpClient.post<Assinante>(environment.Assinante.ativar, null, { params: new HttpParams().set('id', id) });
    }

    RedefinirAcesso(id: string): Observable<AssinanteSenhaTemporaria> {
        return this._httpClient.post<AssinanteSenhaTemporaria>(environment.Assinante.redefinirAcesso, null, { params: new HttpParams().set('id', id) });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
