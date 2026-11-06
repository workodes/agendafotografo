import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { PendenciaModeloListItem } from 'app/models/DTOs/responses/PendenciaModeloListItem';
import { PendenciaModelo } from 'app/models/entities/PendenciaModelo';
import { ApiResponse } from 'app/models/ApiResponse';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

// Checklist padrão do assinante (api/PendenciaModelo/*). Não existe Excluir: só Inativar/Ativar.
@Injectable({ providedIn: 'root' })
export class PendenciaModeloService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um modelo é criado/atualizado/inativado/ativado (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // situacao: 'ativos' | 'inativos' | 'todos'. tipoEventoId filtra os modelos do tipo (os de "todos os tipos" não entram).
    GetAllPaginated(page: number, pageSize: number, busca: string, situacao: string, tipoEventoId?: string | null): Observable<PaginatedResponse<PendenciaModeloListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('situacao', situacao);
        if (busca) {
            params = params.set('busca', busca);
        }
        if (tipoEventoId) {
            params = params.set('tipoEventoId', tipoEventoId);
        }
        return this._httpClient.get<PaginatedResponse<PendenciaModeloListItem>>(environment.PendenciaModelo.listar, { params });
    }

    Get(id: string): Observable<PendenciaModelo> {
        return this._httpClient.get<PendenciaModelo>(environment.PendenciaModelo.obter, { params: new HttpParams().set('id', id) });
    }

    Add(modelo: PendenciaModelo): Observable<PendenciaModelo> {
        return this._httpClient.post<PendenciaModelo>(environment.PendenciaModelo.criar, modelo, { headers: this._headers });
    }

    Update(modelo: PendenciaModelo): Observable<PendenciaModelo> {
        return this._httpClient.put<PendenciaModelo>(environment.PendenciaModelo.atualizar, modelo, { headers: this._headers });
    }

    // Inativar e Ativar devolvem só ApiResponse: quem chama recarrega o modelo (Get).
    Inativar(id: string): Observable<ApiResponse> {
        return this._httpClient.post<ApiResponse>(environment.PendenciaModelo.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<ApiResponse> {
        return this._httpClient.post<ApiResponse>(environment.PendenciaModelo.ativar, null, { params: new HttpParams().set('id', id) });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
