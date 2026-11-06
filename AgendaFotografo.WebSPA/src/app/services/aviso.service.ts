import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, Observable, of, tap } from 'rxjs';
import { AvisosResponse } from 'app/models/DTOs/responses/AvisosResponse';
import { environment } from 'environments/environment';

// Avisos do assinante (api/Aviso/Listar; Admin recebe 403, por isso só o Assinante usa). A API calcula tudo; o front só mostra.
// `avisos$` alimenta o sino do cabeçalho: null = ainda não carregou (o sino aparece sem número, sem erro na tela).
// Uma falha transitória mantém os últimos avisos bons; `carregando$` e `falhou$` deixam o painel distinguir "carregando" de "não carregou".
@Injectable({ providedIn: 'root' })
export class AvisoService {
    private readonly _avisos = new BehaviorSubject<AvisosResponse | null>(null);

    private readonly _carregando = new BehaviorSubject<boolean>(false);
    private readonly _falhou = new BehaviorSubject<boolean>(false);

    readonly avisos$ = this._avisos.asObservable();
    /** true enquanto a carga silenciosa do sino está em andamento. */
    readonly carregando$ = this._carregando.asObservable();
    /** true quando a última carga silenciosa falhou (os últimos avisos bons, se houver, continuam em `avisos$`). */
    readonly falhou$ = this._falhou.asObservable();

    constructor(private _httpClient: HttpClient) { }

    /** Carga silenciosa (sino): atualiza `avisos$`; se falhar, mantém o último valor bom, marca `falhou$` e não propaga erro. */
    Carregar(): void {
        this._carregando.next(true);
        this.Listar().pipe(catchError(() => of(null))).subscribe(r => {
            this._carregando.next(false);
            this._falhou.next(r === null);
        });
    }

    /** Chamada que expõe o erro (usada pelo Início, que tem "Tentar de novo"). Também atualiza `avisos$`. */
    Listar(): Observable<AvisosResponse> {
        return this._httpClient.get<AvisosResponse>(environment.Aviso.listar).pipe(tap(r => { this._avisos.next(r); this._falhou.next(false); }));
    }

    /** Limpa o estado (ao sair da sessão/layout do assinante). */
    Limpar(): void {
        this._avisos.next(null);
        this._carregando.next(false);
        this._falhou.next(false);
    }
}
