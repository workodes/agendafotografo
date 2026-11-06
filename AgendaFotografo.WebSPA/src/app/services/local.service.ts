import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalSugestao } from 'app/models/DTOs/responses/LocalSugestao';
import { environment } from 'environments/environment';

// Autocomplete de locais (api/Local/Buscar). A API repassa à Geoapify; a chave nunca chega ao navegador.
@Injectable({ providedIn: 'root' })
export class LocalService {
    constructor(private _httpClient: HttpClient) { }

    Buscar(texto: string): Observable<LocalSugestao[]> {
        return this._httpClient.get<LocalSugestao[]>(environment.Local.buscar, { params: new HttpParams().set('texto', texto) });
    }
}
