import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DashboardResumo } from 'app/models/DTOs/responses/DashboardResumo';
import { FinanceiroDashboard } from 'app/models/DTOs/responses/FinanceiroDashboard';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

// Resumo do Início do assinante (api/Dashboard/Resumo; Admin = 403). Sem parâmetros: o mês é o atual, calculado pela API.
@Injectable({ providedIn: 'root' })
export class DashboardService {
    constructor(private _httpClient: HttpClient) { }

    Resumo(): Observable<DashboardResumo> {
        return this._httpClient.get<DashboardResumo>(environment.Dashboard.resumo);
    }

    // Gráficos do Financeiro (plano 22; api/Dashboard/Financeiro). dataDe/dataAte "yyyy-MM-dd", ambas ou nenhuma ("Tudo").
    Financeiro(dataDe?: string | null, dataAte?: string | null): Observable<FinanceiroDashboard> {
        let params = new HttpParams();
        if (dataDe && dataAte) {
            params = params.set('dataDe', dataDe).set('dataAte', dataAte);
        }
        return this._httpClient.get<FinanceiroDashboard>(environment.Dashboard.financeiro, { params });
    }
}
