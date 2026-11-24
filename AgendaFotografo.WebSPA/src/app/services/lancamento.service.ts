import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiResponse } from 'app/models/ApiResponse';
import { LancamentoFiltro } from 'app/models/DTOs/filters/LancamentoFiltro';
import { LancamentoListItem } from 'app/models/DTOs/responses/LancamentoListItem';
import { LancamentoResumo } from 'app/models/DTOs/responses/LancamentoResumo';
import { Lancamento } from 'app/models/entities/Lancamento';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

// Lançamentos do coordenador (api/Lancamento/*; só o Assinante). `id` sempre na query.
@Injectable({ providedIn: 'root' })
export class LancamentoService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um lançamento é criado, atualizado ou excluído (lista, cartões e gráficos recarregam). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    private paramsDoFiltro(filtro: LancamentoFiltro): HttpParams {
        let params = new HttpParams();
        if (filtro.busca) {
            params = params.set('busca', filtro.busca);
        }
        if (filtro.dataDe && filtro.dataAte) {
            params = params.set('dataDe', filtro.dataDe).set('dataAte', filtro.dataAte);
        }
        return params;
    }

    GetAllPaginated(page: number, pageSize: number, filtro: LancamentoFiltro): Observable<PaginatedResponse<LancamentoListItem>> {
        let params = this.paramsDoFiltro(filtro).set('page', page).set('pageSize', pageSize);
        if (filtro.ordenar) {
            params = params.set('ordenar', filtro.ordenar);
        }
        if (filtro.sentido) {
            params = params.set('sentido', filtro.sentido);
        }
        return this._httpClient.get<PaginatedResponse<LancamentoListItem>>(environment.Lancamento.listar, { params });
    }

    Resumo(filtro: LancamentoFiltro): Observable<LancamentoResumo> {
        return this._httpClient.get<LancamentoResumo>(environment.Lancamento.resumo, { params: this.paramsDoFiltro(filtro) });
    }

    Get(id: string): Observable<Lancamento> {
        return this._httpClient.get<Lancamento>(environment.Lancamento.obter, { params: new HttpParams().set('id', id) });
    }

    Add(lancamento: Lancamento): Observable<Lancamento> {
        return this._httpClient.post<Lancamento>(environment.Lancamento.criar, lancamento, { headers: this._headers });
    }

    Update(lancamento: Lancamento): Observable<Lancamento> {
        return this._httpClient.put<Lancamento>(environment.Lancamento.atualizar, lancamento, { headers: this._headers });
    }

    Delete(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Lancamento.excluir, { params: new HttpParams().set('id', id) });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
