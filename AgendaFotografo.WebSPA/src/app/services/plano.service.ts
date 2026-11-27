import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiResponse } from 'app/models/ApiResponse';
import { ModulosCatalogo } from 'app/models/DTOs/responses/ModulosCatalogo';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { PlanoListItem } from 'app/models/DTOs/responses/PlanoListItem';
import { Plano } from 'app/models/entities/Plano';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

// Planos e módulos liberados (api/Plano/*, plano 24; só o Admin). `id` sempre na query.
@Injectable({ providedIn: 'root' })
export class PlanoService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um plano é criado/atualizado/inativado/ativado/excluído (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'todos' (padrão), 'true' (ativos) ou 'false' (inativos)
    GetAllPaginated(page: number, pageSize: number, busca: string, ativo: string): Observable<PaginatedResponse<PlanoListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        return this._httpClient.get<PaginatedResponse<PlanoListItem>>(environment.Plano.listar, { params });
    }

    Get(id: string): Observable<Plano> {
        return this._httpClient.get<Plano>(environment.Plano.obter, { params: new HttpParams().set('id', id) });
    }

    Add(plano: Plano): Observable<Plano> {
        return this._httpClient.post<Plano>(environment.Plano.criar, plano, { headers: this._headers });
    }

    Update(plano: Plano): Observable<Plano> {
        return this._httpClient.put<Plano>(environment.Plano.atualizar, plano, { headers: this._headers });
    }

    Inativar(id: string): Observable<Plano> {
        return this._httpClient.post<Plano>(environment.Plano.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<Plano> {
        return this._httpClient.post<Plano>(environment.Plano.ativar, null, { params: new HttpParams().set('id', id) });
    }

    Delete(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Plano.excluir, { params: new HttpParams().set('id', id) });
    }

    // Combo de planos (ficha do assinante). incluirId traz o plano atual mesmo inativo.
    Opcoes(somenteAtivos = true, incluirId?: string | null): Observable<Opcao[]> {
        let params = new HttpParams().set('somenteAtivos', somenteAtivos);
        if (incluirId) {
            params = params.set('incluirId', incluirId);
        }
        return this._httpClient.get<Opcao[]>(environment.Plano.opcoes, { params });
    }

    /** Catálogo de módulos liberáveis e o texto dos sempre liberados. */
    Modulos(): Observable<ModulosCatalogo> {
        return this._httpClient.get<ModulosCatalogo>(environment.Plano.modulos);
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
