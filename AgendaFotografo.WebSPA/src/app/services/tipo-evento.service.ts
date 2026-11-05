import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { TipoEventoListItem } from 'app/models/DTOs/responses/TipoEventoListItem';
import { TipoEvento } from 'app/models/entities/TipoEvento';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class TipoEventoService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um tipo é criado/atualizado/inativado/ativado (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'true' (ativos), 'false' (inativos) ou 'todos'
    GetAllPaginated(page: number, pageSize: number, busca: string, ativo: string): Observable<PaginatedResponse<TipoEventoListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        return this._httpClient.get<PaginatedResponse<TipoEventoListItem>>(environment.TipoEvento.listar, { params });
    }

    Get(id: string): Observable<TipoEvento> {
        return this._httpClient.get<TipoEvento>(environment.TipoEvento.obter, { params: new HttpParams().set('id', id) });
    }

    Add(tipo: TipoEvento): Observable<TipoEvento> {
        return this._httpClient.post<TipoEvento>(environment.TipoEvento.criar, tipo, { headers: this._headers });
    }

    Update(tipo: TipoEvento): Observable<TipoEvento> {
        return this._httpClient.put<TipoEvento>(environment.TipoEvento.atualizar, tipo, { headers: this._headers });
    }

    Inativar(id: string): Observable<TipoEvento> {
        return this._httpClient.post<TipoEvento>(environment.TipoEvento.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<TipoEvento> {
        return this._httpClient.post<TipoEvento>(environment.TipoEvento.ativar, null, { params: new HttpParams().set('id', id) });
    }

    // Combo de tipos (outros módulos). incluirId traz o registro mesmo inativo (edição de algo que já o usa).
    Opcoes(somenteAtivos = true, incluirId?: string | null): Observable<Opcao[]> {
        let params = new HttpParams().set('somenteAtivos', somenteAtivos);
        if (incluirId) {
            params = params.set('incluirId', incluirId);
        }
        return this._httpClient.get<Opcao[]>(environment.TipoEvento.opcoes, { params });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
