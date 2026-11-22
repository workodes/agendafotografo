import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EscalaEventoModel } from 'app/models/DTOs/responses/EscalaEventoModel';
import { EscalaItem } from 'app/models/DTOs/responses/EscalaItem';
import { environment } from 'environments/environment';

/** Eventos de coordenadores em que o Fotógrafo foi escalado (`api/Escala/*`, só perfil Fotografo, somente leitura). */
@Injectable({ providedIn: 'root' })
export class EscalaService {
    constructor(private _httpClient: HttpClient) { }

    /** Intervalo "yyyy-MM-dd" inclusivo, no máximo 62 dias. */
    Listar(dataDe: string, dataAte: string): Observable<EscalaItem[]> {
        const params = new HttpParams().set('dataDe', dataDe).set('dataAte', dataAte);
        return this._httpClient.get<EscalaItem[]>(environment.Escala.listar, { params });
    }

    Get(eventoId: string): Observable<EscalaEventoModel> {
        return this._httpClient.get<EscalaEventoModel>(environment.Escala.obter, { params: new HttpParams().set('id', eventoId) });
    }

    // tipo = TipoArquivoEvento (2 ImagemRota, 3 Gpx). Erros chegam como Blob: usar extrairMensagemErroBlob.
    Arquivo(eventoId: string, tipo: number): Observable<Blob> {
        return this._httpClient.get(environment.Escala.arquivo, {
            params: new HttpParams().set('id', eventoId).set('tipo', tipo),
            responseType: 'blob',
        });
    }
}
