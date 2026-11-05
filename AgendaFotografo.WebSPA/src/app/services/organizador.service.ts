import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { OrganizadorListItem } from 'app/models/DTOs/responses/OrganizadorListItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { Organizador } from 'app/models/entities/Organizador';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class OrganizadorService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um organizador é criado/atualizado/inativado/ativado (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'true' (ativos), 'false' (inativos) ou 'todos'
    GetAllPaginated(page: number, pageSize: number, busca: string, ativo: string): Observable<PaginatedResponse<OrganizadorListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        return this._httpClient.get<PaginatedResponse<OrganizadorListItem>>(environment.Organizador.listar, { params });
    }

    Get(id: string): Observable<Organizador> {
        return this._httpClient.get<Organizador>(environment.Organizador.obter, { params: new HttpParams().set('id', id) });
    }

    Add(organizador: Organizador): Observable<Organizador> {
        return this._httpClient.post<Organizador>(environment.Organizador.criar, organizador, { headers: this._headers });
    }

    Update(organizador: Organizador): Observable<Organizador> {
        return this._httpClient.put<Organizador>(environment.Organizador.atualizar, organizador, { headers: this._headers });
    }

    Inativar(id: string): Observable<Organizador> {
        return this._httpClient.post<Organizador>(environment.Organizador.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<Organizador> {
        return this._httpClient.post<Organizador>(environment.Organizador.ativar, null, { params: new HttpParams().set('id', id) });
    }

    // Combo de organizadores (cadastro de eventos). incluirId traz o registro mesmo inativo.
    Opcoes(somenteAtivos = true, incluirId?: string | null): Observable<Opcao[]> {
        let params = new HttpParams().set('somenteAtivos', somenteAtivos);
        if (incluirId) {
            params = params.set('incluirId', incluirId);
        }
        return this._httpClient.get<Opcao[]>(environment.Organizador.opcoes, { params });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
