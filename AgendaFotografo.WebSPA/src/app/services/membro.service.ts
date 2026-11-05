import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { MembroListItem } from 'app/models/DTOs/responses/MembroListItem';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { Membro } from 'app/models/entities/Membro';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class MembroService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um membro é criado/atualizado/inativado/ativado (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // ativo: 'true' (ativos), 'false' (inativos) ou 'todos'; funcao: valor do enum FuncaoMembro (sem valor = todas).
    GetAllPaginated(page: number, pageSize: number, busca: string, ativo: string, funcao?: number | null): Observable<PaginatedResponse<MembroListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize).set('ativo', ativo);
        if (busca) {
            params = params.set('busca', busca);
        }
        if (funcao != null) {
            params = params.set('funcao', funcao);
        }
        return this._httpClient.get<PaginatedResponse<MembroListItem>>(environment.Membro.listar, { params });
    }

    Get(id: string): Observable<Membro> {
        return this._httpClient.get<Membro>(environment.Membro.obter, { params: new HttpParams().set('id', id) });
    }

    Add(membro: Membro): Observable<Membro> {
        return this._httpClient.post<Membro>(environment.Membro.criar, membro, { headers: this._headers });
    }

    Update(membro: Membro): Observable<Membro> {
        return this._httpClient.put<Membro>(environment.Membro.atualizar, membro, { headers: this._headers });
    }

    Inativar(id: string): Observable<Membro> {
        return this._httpClient.post<Membro>(environment.Membro.inativar, null, { params: new HttpParams().set('id', id) });
    }

    Ativar(id: string): Observable<Membro> {
        return this._httpClient.post<Membro>(environment.Membro.ativar, null, { params: new HttpParams().set('id', id) });
    }

    // Combo de membros (escala de eventos). incluirId traz o registro mesmo inativo.
    Opcoes(somenteAtivos = true, incluirId?: string | null): Observable<Opcao[]> {
        let params = new HttpParams().set('somenteAtivos', somenteAtivos);
        if (incluirId) {
            params = params.set('incluirId', incluirId);
        }
        return this._httpClient.get<Opcao[]>(environment.Membro.opcoes, { params });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
