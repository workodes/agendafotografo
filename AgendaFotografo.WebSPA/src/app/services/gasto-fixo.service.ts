import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiResponse } from 'app/models/ApiResponse';
import { GastoFixoGeracao } from 'app/models/DTOs/responses/GastoFixoGeracao';
import { GastoFixoListItem } from 'app/models/DTOs/responses/GastoFixoListItem';
import { GastoFixoResumo } from 'app/models/DTOs/responses/GastoFixoResumo';
import { GastoFixo } from 'app/models/entities/GastoFixo';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

// Gastos fixos do coordenador (api/GastoFixo/*; só o Assinante). `id` sempre na query.
@Injectable({ providedIn: 'root' })
export class GastoFixoService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um gasto fixo é criado, atualizado, pausado, retomado ou excluído (a lista recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'todos' (padrão) | 'true' | 'false'
    GetAllPaginated(page: number, pageSize: number, busca: string = '', ativo: string = 'todos'): Observable<PaginatedResponse<GastoFixoListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        return this._httpClient.get<PaginatedResponse<GastoFixoListItem>>(environment.GastoFixo.listar, { params });
    }

    Resumo(): Observable<GastoFixoResumo> {
        return this._httpClient.get<GastoFixoResumo>(environment.GastoFixo.resumo);
    }

    Get(id: string): Observable<GastoFixo> {
        return this._httpClient.get<GastoFixo>(environment.GastoFixo.obter, { params: new HttpParams().set('id', id) });
    }

    Add(gasto: GastoFixo): Observable<GastoFixo> {
        return this._httpClient.post<GastoFixo>(environment.GastoFixo.criar, gasto, { headers: this._headers });
    }

    Update(gasto: GastoFixo): Observable<GastoFixo> {
        return this._httpClient.put<GastoFixo>(environment.GastoFixo.atualizar, gasto, { headers: this._headers });
    }

    // "Pausar" na tela. Idempotente; devolve o model.
    Inativar(id: string): Observable<GastoFixo> {
        return this._httpClient.post<GastoFixo>(environment.GastoFixo.inativar, null, { params: new HttpParams().set('id', id) });
    }

    // "Retomar" na tela. Idempotente; devolve o model.
    Ativar(id: string): Observable<GastoFixo> {
        return this._httpClient.post<GastoFixo>(environment.GastoFixo.ativar, null, { params: new HttpParams().set('id', id) });
    }

    Delete(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.GastoFixo.excluir, { params: new HttpParams().set('id', id) });
    }

    // POST sem corpo: gera os lançamentos de Despesa dos meses que faltam (idempotente). Chamado pelo resolver do Financeiro.
    GerarLancamentos(): Observable<GastoFixoGeracao> {
        return this._httpClient.post<GastoFixoGeracao>(environment.GastoFixo.gerarLancamentos, null);
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
