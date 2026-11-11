import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DashboardResumo } from 'app/models/DTOs/responses/DashboardResumo';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

// Resumo do Início do assinante (api/Dashboard/Resumo; Admin = 403). Sem parâmetros: o mês é o atual, calculado pela API.
@Injectable({ providedIn: 'root' })
export class DashboardService {
    constructor(private _httpClient: HttpClient) { }

    Resumo(): Observable<DashboardResumo> {
        return this._httpClient.get<DashboardResumo>(environment.Dashboard.resumo);
    }
}
