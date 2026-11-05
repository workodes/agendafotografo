import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiViaCep } from 'app/models/ApiViaCep';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ViacepService {

  constructor(
    private httpClient: HttpClient
  ) { }

  getCep(cep: string): Observable<ApiViaCep> {
    return this.httpClient.get<ApiViaCep>(`https://viacep.com.br/ws/${cep}/json/`);
  }
}
