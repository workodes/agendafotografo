import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AgendaFiltro } from 'app/models/DTOs/filters/AgendaFiltro';
import { EventoFiltro } from 'app/models/DTOs/filters/EventoFiltro';
import { PendenciaFiltro } from 'app/models/DTOs/filters/PendenciaFiltro';
import { EventoPendenciaModel, EventoPendenciaStatusModel } from 'app/models/DTOs/requests/EventoPendenciaModel';
import { EventoPendenciaItem } from 'app/models/DTOs/responses/EventoPendenciaItem';
import { EventoMembroModel, EventoMembroPosicaoModel } from 'app/models/DTOs/requests/EventoMembroModel';
import { DiaResponse } from 'app/models/DTOs/responses/DiaResponse';
import { EventoLinkModel } from 'app/models/DTOs/requests/EventoLinkModel';
import { EventoArquivoItem } from 'app/models/DTOs/responses/EventoArquivoItem';
import { EventoLinkItem } from 'app/models/DTOs/responses/EventoLinkItem';
import { EventoListItem } from 'app/models/DTOs/responses/EventoListItem';
import { EventoMembroItem, OpcaoEscalaItem } from 'app/models/DTOs/responses/EventoMembroItem';
import { Evento } from 'app/models/entities/Evento';
import { ApiResponse } from 'app/models/ApiResponse';
import { PaginatedResponse } from 'app/models/PaginatedResponse';
import { environment } from 'environments/environment';

@Injectable({ providedIn: 'root' })
export class EventoService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _alterado = new Subject<void>();

    /** Emite quando um evento é criado/atualizado/excluído ou a escala muda (a listagem recarrega). */
    readonly alterado$ = this._alterado.asObservable();

    constructor(private _httpClient: HttpClient) { }

    // Filtros opcionais: só vão na query quando preenchidos. Datas "yyyy-MM-dd"; status = enum StatusEvento.
    GetAllPaginated(page: number, pageSize: number, filtro: EventoFiltro = {}): Observable<PaginatedResponse<EventoListItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (filtro.busca) {
            params = params.set('busca', filtro.busca);
        }
        if (filtro.dataDe) {
            params = params.set('dataDe', filtro.dataDe);
        }
        if (filtro.dataAte) {
            params = params.set('dataAte', filtro.dataAte);
        }
        if (filtro.status != null) {
            params = params.set('status', filtro.status);
        }
        if (filtro.tipoEventoId) {
            params = params.set('tipoEventoId', filtro.tipoEventoId);
        }
        if (filtro.organizadorId) {
            params = params.set('organizadorId', filtro.organizadorId);
        }
        if (filtro.ordem) {
            params = params.set('ordem', filtro.ordem);
        }
        return this._httpClient.get<PaginatedResponse<EventoListItem>>(environment.Evento.listar, { params });
    }

    // Eventos do intervalo (inclusivo, no máximo 62 dias), sem paginação e com a equipe. Filtros opcionais só vão na query quando preenchidos.
    Agenda(filtro: AgendaFiltro): Observable<EventoListItem[]> {
        let params = new HttpParams().set('dataDe', filtro.dataDe).set('dataAte', filtro.dataAte);
        if (filtro.status != null) {
            params = params.set('status', filtro.status);
        }
        if (filtro.tipoEventoId) {
            params = params.set('tipoEventoId', filtro.tipoEventoId);
        }
        if (filtro.cidade) {
            params = params.set('cidade', filtro.cidade);
        }
        if (filtro.membroId) {
            params = params.set('membroId', filtro.membroId);
        }
        return this._httpClient.get<EventoListItem[]>(environment.Evento.agenda, { params });
    }

    // Cidades distintas dos eventos do assinante (combo da Agenda).
    Cidades(): Observable<string[]> {
        return this._httpClient.get<string[]>(environment.Evento.cidades);
    }

    Get(id: string): Observable<Evento> {
        return this._httpClient.get<Evento>(environment.Evento.obter, { params: new HttpParams().set('id', id) });
    }

    Add(evento: Evento): Observable<Evento> {
        return this._httpClient.post<Evento>(environment.Evento.criar, evento, { headers: this._headers });
    }

    Update(evento: Evento): Observable<Evento> {
        return this._httpClient.put<Evento>(environment.Evento.atualizar, evento, { headers: this._headers });
    }

    Delete(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Evento.excluir, { params: new HttpParams().set('id', id) });
    }

    // ---- Escala da equipe ----

    // Escala do evento (cada membro traz OutrosEventos do mesmo dia).
    Membros(eventoId: string): Observable<EventoMembroItem[]> {
        return this._httpClient.get<EventoMembroItem[]>(environment.Evento.membros, { params: new HttpParams().set('id', eventoId) });
    }

    // Membros ativos ainda fora da escala, com OutrosEventos (alerta de conflito na hora de escalar).
    OpcoesEscala(eventoId: string): Observable<OpcaoEscalaItem[]> {
        return this._httpClient.get<OpcaoEscalaItem[]>(environment.Evento.opcoesEscala, { params: new HttpParams().set('id', eventoId) });
    }

    AdicionarMembro(model: EventoMembroModel): Observable<EventoMembroItem> {
        return this._httpClient.post<EventoMembroItem>(environment.Evento.adicionarMembro, model, { headers: this._headers });
    }

    // id = Id da linha da escala (EventoMembroItem.Id).
    AtualizarMembro(id: string, model: EventoMembroPosicaoModel): Observable<EventoMembroItem> {
        return this._httpClient.put<EventoMembroItem>(environment.Evento.atualizarMembro, model, { headers: this._headers, params: new HttpParams().set('id', id) });
    }

    // id = Id da linha da escala (EventoMembroItem.Id).
    RemoverMembro(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Evento.removerMembro, { params: new HttpParams().set('id', id) });
    }

    // ---- Pendências ----

    // Pendências de um evento, na ordem da ficha (abertas antes das concluídas, depois prazo e prioridade).
    Pendencias(eventoId: string): Observable<EventoPendenciaItem[]> {
        return this._httpClient.get<EventoPendenciaItem[]>(environment.Evento.pendencias, { params: new HttpParams().set('id', eventoId) });
    }

    // Lista geral (eventos não cancelados). Sem status = só as abertas. Filtros só vão na query quando preenchidos.
    ListarPendencias(page: number, pageSize: number, filtro: PendenciaFiltro = {}): Observable<PaginatedResponse<EventoPendenciaItem>> {
        let params = new HttpParams().set('page', page).set('pageSize', pageSize);
        if (filtro.status) {
            params = params.set('status', filtro.status);
        }
        if (filtro.prioridade != null) {
            params = params.set('prioridade', filtro.prioridade);
        }
        if (filtro.membroId) {
            params = params.set('membroId', filtro.membroId);
        }
        if (filtro.prazo) {
            params = params.set('prazo', filtro.prazo);
        }
        return this._httpClient.get<PaginatedResponse<EventoPendenciaItem>>(environment.Evento.listarPendencias, { params });
    }

    AdicionarPendencia(model: EventoPendenciaModel): Observable<EventoPendenciaItem> {
        return this._httpClient.post<EventoPendenciaItem>(environment.Evento.adicionarPendencia, model, { headers: this._headers });
    }

    AtualizarPendencia(model: EventoPendenciaModel): Observable<EventoPendenciaItem> {
        return this._httpClient.put<EventoPendenciaItem>(environment.Evento.atualizarPendencia, model, { headers: this._headers });
    }

    // Troca só o status (menu do chip).
    AtualizarStatusPendencia(id: string, model: EventoPendenciaStatusModel): Observable<EventoPendenciaItem> {
        return this._httpClient.put<EventoPendenciaItem>(environment.Evento.atualizarStatusPendencia, model, { headers: this._headers, params: new HttpParams().set('id', id) });
    }

    ExcluirPendencia(id: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Evento.excluirPendencia, { params: new HttpParams().set('id', id) });
    }

    // data "yyyy-MM-dd": eventos do dia, membros livres e conflitos.
    Dia(data: string): Observable<DiaResponse> {
        return this._httpClient.get<DiaResponse>(environment.Evento.dia, { params: new HttpParams().set('data', data) });
    }

    // ---- Arquivos (flyer, imagem do percurso e GPX) ----

    // tipo = enum TipoArquivoEvento. Multipart com o campo "Arquivo"; enviar outro do mesmo tipo substitui o anterior.
    EnviarArquivo(eventoId: string, tipo: number, arquivo: File): Observable<EventoArquivoItem> {
        const formData = new FormData();
        formData.append('Arquivo', arquivo, arquivo.name);
        return this._httpClient.post<EventoArquivoItem>(environment.Evento.enviarArquivo, formData, { params: new HttpParams().set('id', eventoId).set('tipo', tipo) });
    }

    // Blob autenticado (miniatura via createObjectURL e download do GPX). Erros chegam como Blob: usar extrairMensagemErroBlob.
    BaixarArquivo(arquivoId: string): Observable<Blob> {
        return this._httpClient.get(environment.Evento.baixarArquivo, { params: new HttpParams().set('id', arquivoId), responseType: 'blob' });
    }

    ExcluirArquivo(arquivoId: string): Observable<ApiResponse> {
        return this._httpClient.delete<ApiResponse>(environment.Evento.excluirArquivo, { params: new HttpParams().set('id', arquivoId) });
    }

    // ---- Link público (coordenador). Respostas trazem o Codigo: mantê-lo só em memória ----

    Link(eventoId: string): Observable<EventoLinkItem> {
        return this._httpClient.get<EventoLinkItem>(environment.Evento.link, { params: new HttpParams().set('id', eventoId) });
    }

    // Cria o link (se ainda não existe) ou muda só EVL_ATIVO e EVL_MOSTRAR_EQUIPE.
    AtualizarLink(eventoId: string, model: EventoLinkModel): Observable<EventoLinkItem> {
        return this._httpClient.put<EventoLinkItem>(environment.Evento.atualizarLink, model, { headers: this._headers, params: new HttpParams().set('id', eventoId) });
    }

    RegerarCodigoLink(eventoId: string): Observable<EventoLinkItem> {
        return this._httpClient.post<EventoLinkItem>(environment.Evento.regerarCodigoLink, null, { params: new HttpParams().set('id', eventoId) });
    }

    RegerarLink(eventoId: string): Observable<EventoLinkItem> {
        return this._httpClient.post<EventoLinkItem>(environment.Evento.regerarLink, null, { params: new HttpParams().set('id', eventoId) });
    }

    NotificarAlteracao(): void {
        this._alterado.next();
    }
}
