import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiViaCep } from 'app/models/ApiViaCep';
import { BrasilApiCnpj } from 'app/models/BrasilApiCnpj';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BrasilApiService {

  constructor(
    private httpClient: HttpClient
  ) { }

  getCnpj(cnpj: string) {
    return this.httpClient.get<BrasilApiCnpj>(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
  }
}
