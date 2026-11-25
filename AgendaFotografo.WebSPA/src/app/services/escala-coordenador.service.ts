import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EscalaEventoModel } from 'app/models/DTOs/responses/EscalaEventoModel';
import { EscalaItem } from 'app/models/DTOs/responses/EscalaItem';
import { environment } from 'environments/environment';

/**
 * Eventos de OUTRAS equipes em que o coordenador (Assinante) foi escalado por outro coordenador, pelo mesmo documento
 * (CPF ou CNPJ) da conta (plano 23; `api/EscalaCoordenador/*`, só perfil Assinante, somente leitura).
 * Só a Agenda e o detalhe chamam este service: nenhuma outra tela do coordenador mostra eventos de outras equipes.
 */
@Injectable({ providedIn: 'root' })
export class EscalaCoordenadorService {
    constructor(private _httpClient: HttpClient) { }

    /** Intervalo "yyyy-MM-dd" inclusivo, no máximo 62 dias. */
    Listar(dataDe: string, dataAte: string): Observable<EscalaItem[]> {
        const params = new HttpParams().set('dataDe', dataDe).set('dataAte', dataAte);
        return this._httpClient.get<EscalaItem[]>(environment.EscalaCoordenador.listar, { params });
    }

    Get(eventoId: string): Observable<EscalaEventoModel> {
        return this._httpClient.get<EscalaEventoModel>(environment.EscalaCoordenador.obter, { params: new HttpParams().set('id', eventoId) });
    }

    // tipo = TipoArquivoEvento (1 Flyer, 2 ImagemRota, 3 Gpx). Erros chegam como Blob: usar extrairMensagemErroBlob.
    Arquivo(eventoId: string, tipo: number): Observable<Blob> {
        return this._httpClient.get(environment.EscalaCoordenador.arquivo, {
            params: new HttpParams().set('id', eventoId).set('tipo', tipo),
            responseType: 'blob',
        });
    }
}
