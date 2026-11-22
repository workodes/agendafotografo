import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ApiResponse } from 'app/models/ApiResponse';
import { EventoPessoalListItem } from 'app/models/DTOs/responses/EventoPessoalListItem';
import { EventoPessoal } from 'app/models/entities/EventoPessoal';
import { environment } from 'environments/environment';

/** Agenda pessoal do Fotógrafo (`api/EventoPessoal/*`, só perfil Fotografo; `id` sempre na query). */
@Injectable({ providedIn: 'root' })
export class EventoPessoalService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um evento pessoal é criado/atualizado/excluído (a agenda recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    NotificarAlteracao(): void {
        this._alterado.next();
    }

    /** Eventos do intervalo ("yyyy-MM-dd", inclusivo, no máximo 62 dias), sem paginação. */
    Agenda(dataDe: string, dataAte: string): Observable<EventoPessoalListItem[]> {
        const params = new HttpParams().set('dataDe', dataDe).set('dataAte', dataAte);
        return this._httpClient.get<EventoPessoalListItem[]>(environment.EventoPessoal.agenda, { params });
    }

    Get(id: string): Observable<EventoPessoal> {
        return this._httpClient.get<EventoPessoal>(environment.EventoPessoal.obter, { params: new HttpParams().set('id', id) });
    }

    Add(body: EventoPessoal): Observable<EventoPessoal> {
        return this._httpClient.post<EventoPessoal>(environment.EventoPessoal.criar, body, { headers: this._headers });
    }

    Update(body: EventoPessoal): Observable<EventoPessoal> {
        return this._httpClient.put<EventoPessoal>(environment.EventoPessoal.atualizar, body, { headers: this._headers });
    }

    Delete(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.EventoPessoal.excluir, { params: new HttpParams().set('id', id) });
    }
}
