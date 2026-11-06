import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LinkPublicoAcessoModel } from 'app/models/DTOs/requests/LinkPublicoAcessoModel';
import { EventoPublico } from 'app/models/DTOs/responses/EventoPublico';
import { LinkPublicoAcesso } from 'app/models/DTOs/responses/LinkPublicoAcesso';
import { environment } from 'environments/environment';

// Endpoints anônimos do link público (api/LinkPublico/*). O acesso de 7 dias vai em X-Acesso-Link (nunca em Authorization);
// o aparelho em X-Aparelho. A API nunca devolve 401 nestas rotas.
@Injectable({ providedIn: 'root' })
export class LinkPublicoService {
    constructor(private _httpClient: HttpClient) { }

    Acessar(model: LinkPublicoAcessoModel, aparelho: string): Observable<LinkPublicoAcesso> {
        const headers = new HttpHeaders({ 'Content-Type': 'application/json', 'X-Aparelho': aparelho });
        return this._httpClient.post<LinkPublicoAcesso>(environment.LinkPublico.acessar, model, { headers });
    }

    Evento(token: string, acesso: string): Observable<EventoPublico> {
        return this._httpClient.get<EventoPublico>(environment.LinkPublico.evento, {
            headers: new HttpHeaders({ 'X-Acesso-Link': acesso }),
            params: new HttpParams().set('token', token),
        });
    }

    // tipo = TipoArquivoEvento (1 Flyer, 2 ImagemRota, 3 Gpx). Erros chegam como Blob: usar extrairMensagemErroBlob.
    Arquivo(token: string, tipo: number, acesso: string): Observable<Blob> {
        return this._httpClient.get(environment.LinkPublico.arquivo, {
            headers: new HttpHeaders({ 'X-Acesso-Link': acesso }),
            params: new HttpParams().set('token', token).set('tipo', tipo),
            responseType: 'blob',
        });
    }
}
