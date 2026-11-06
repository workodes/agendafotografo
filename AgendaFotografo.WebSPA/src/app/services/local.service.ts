import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LocalSugestao } from 'app/models/DTOs/responses/LocalSugestao';
import { environment } from 'environments/environment';

// Autocomplete de locais (api/Local/Buscar). A API repassa à Geoapify; a chave nunca chega ao navegador.
@Injectable({ providedIn: 'root' })
export class LocalService {
    constructor(private _httpClient: HttpClient) { }

    /** `somenteCidades`: só cidades (campo Cidade). */
    Buscar(texto: string, somenteCidades = false): Observable<LocalSugestao[]> {
        let params = new HttpParams().set('texto', texto);
        if (somenteCidades) {
            params = params.set('tipo', 'cidade');
        }
        return this._httpClient.get<LocalSugestao[]>(environment.Local.buscar, { params });
    }
}
