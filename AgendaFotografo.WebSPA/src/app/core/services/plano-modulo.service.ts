import { HttpClient } from '@angular/common/http';
import { Injectable, Injector, inject, signal } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { ModulosUsuario } from 'app/models/DTOs/responses/ModulosUsuario';
import { Usuario } from 'app/models/entities/Usuario';
import { ModuloPlano } from 'app/models/enums/ModuloPlano';
import { environment } from 'environments/environment';
import { Observable, Subject, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';

/** Rotas do Assinante usadas quando um módulo não está liberado. */
export const ROTA_AGENDA_ASSINANTE = '/assinante/agenda';
export const ROTA_NAO_DISPONIVEL = '/assinante/nao-disponivel';

/**
 * Plano e módulos liberados do Assinante logado (plano 24; molde do plano-modulo.service do AgroGestor).
 * - Os módulos chegam no login (`registrarSessao`) e ficam também em localStorage['usuario'] só para a rota inicial ser síncrona;
 *   são recarregados de `Auth/Modulos` uma vez a cada entrada no app (F5) e depois de um 403 (interceptor).
 * - `null` = sem filtro (Admin, Fotógrafo, sessão anterior ao plano 24 ou carga que falhou sem nada conhecido): tudo liberado no SPA,
 *   e a API barra de qualquer forma. Se a carga falhar com uma lista já conhecida, a lista conhecida continua valendo.
 * - É só conforto de tela: quem decide é a API (403 "<Módulo> não está disponível no seu plano.").
 */
@Injectable({ providedIn: 'root' })
export class PlanoModuloService {
    private _httpClient = inject(HttpClient);
    // Router pego sob demanda: o AuthService (que injeta este service) sobe num ENVIRONMENT_INITIALIZER.
    private _injector = inject(Injector);
    private get _router(): Router {
        return this._injector.get(Router);
    }

    private readonly _modulos = signal<number[] | null>(null);
    private readonly _planoNome = signal<string | null>(null);
    private readonly _alterado = new Subject<void>();
    private _carregadoNestaPagina = false;
    private _carga$: Observable<void> | null = null;

    /** Módulos liberados (null = sem filtro). Signal: telas e menu reagem sozinhos. */
    readonly modulos = this._modulos.asReadonly();
    readonly planoNome = this._planoNome.asReadonly();
    /** Emite quando a lista de módulos muda (o menu é remontado). */
    readonly alterado$ = this._alterado.asObservable();

    constructor() {
        this.lerGuardado();
    }

    /** O módulo está liberado para a sessão (sem filtro = liberado). */
    Liberado(modulo: ModuloPlano): boolean {
        const lista = this._modulos();
        return lista === null || lista.includes(modulo);
    }

    /**
     * Grava os módulos (login ou `Auth/Modulos`). `persistir` atualiza localStorage['usuario'] (o login já grava o usuário inteiro).
     * Depois do login a lista é a mais nova: não precisa recarregar nesta página.
     */
    Definir(planoNome: string | null, modulos: number[] | null, persistir = true): void {
        const nova = modulos ? [...modulos].sort((a, b) => a - b) : null;
        const mudou = !iguais(this._modulos(), nova);
        this._modulos.set(nova);
        this._planoNome.set(planoNome ?? null);
        this._carregadoNestaPagina = true;
        if (persistir) {
            this.guardar(planoNome ?? null, nova);
        }
        if (mudou) {
            this._alterado.next();
        }
    }

    /** Recarrega de `Auth/Modulos` (só Assinante). Chamadas simultâneas compartilham a mesma requisição. Nunca dá erro. */
    Carregar(): Observable<void> {
        if (!this._carga$) {
            this._carga$ = this._httpClient.get<ModulosUsuario>(environment.Auth.modulos).pipe(
                tap(r => this.Definir(r?.PlanoNome ?? null, r?.Modulos ?? [])),
                map(() => undefined),
                // Falhou: mantém o que já se sabia (ou sem filtro); a API barra de qualquer forma.
                catchError(() => of(undefined)),
                finalize(() => {
                    this._carregadoNestaPagina = true;
                    this._carga$ = null;
                }),
                shareReplay({ bufferSize: 1, refCount: true }),
            );
        }
        return this._carga$;
    }

    /** Carrega uma vez por página (F5 = nova carga). Depois do login não carrega de novo. */
    GarantirCarregado(): Observable<void> {
        return this._carregadoNestaPagina ? of(undefined) : this.Carregar();
    }

    /** Sign-out: nada do plano sobra para o próximo login. */
    Limpar(): void {
        const mudou = this._modulos() !== null;
        this._modulos.set(null);
        this._planoNome.set(null);
        this._carregadoNestaPagina = false;
        this._carga$ = null;
        if (mudou) {
            this._alterado.next();
        }
    }

    /** Destino de quem tenta abrir um módulo não liberado: Início vai para a Agenda; os demais, para "não disponível". */
    Destino(modulo: ModuloPlano | null): UrlTree {
        if (modulo === ModuloPlano.Inicio) {
            return this._router.parseUrl(ROTA_AGENDA_ASSINANTE);
        }
        return this._router.createUrlTree([ROTA_NAO_DISPONIVEL], modulo ? { queryParams: { modulo } } : {});
    }

    /** Módulo da rota aberta agora (`data.modulo` em qualquer nível da árvore), ou null. */
    ModuloDaRotaAtual(): ModuloPlano | null {
        let atual = this._router.routerState.snapshot.root;
        let modulo: ModuloPlano | null = null;
        while (atual) {
            const m = atual.routeConfig?.data?.['modulo'];
            if (m) {
                modulo = m;
            }
            atual = atual.firstChild!;
        }
        return modulo;
    }

    /**
     * Depois de um 403 (interceptor): recarrega os módulos e, se o módulo da tela aberta deixou de estar liberado, sai dela.
     * Assim a mudança de plano aparece sem F5 (o menu se atualiza pelo `alterado$`).
     */
    ReagirAoBloqueio(): void {
        this.Carregar().subscribe(() => {
            const modulo = this.ModuloDaRotaAtual();
            if (modulo && !this.Liberado(modulo)) {
                this._router.navigateByUrl(this.Destino(modulo));
            }
        });
    }

    private lerGuardado(): void {
        try {
            const salvo = localStorage.getItem('usuario');
            const usuario: Usuario | null = salvo ? JSON.parse(salvo) : null;
            this._modulos.set(Array.isArray(usuario?.Modulos) ? usuario!.Modulos! : null);
            this._planoNome.set(usuario?.PlanoNome ?? null);
        } catch {
            this._modulos.set(null);
        }
    }

    private guardar(planoNome: string | null, modulos: number[] | null): void {
        const salvo = localStorage.getItem('usuario');
        if (!salvo) {
            return;
        }
        try {
            const usuario: Usuario = { ...JSON.parse(salvo), PlanoNome: planoNome, Modulos: modulos };
            localStorage.setItem('usuario', JSON.stringify(usuario));
        } catch {
            /* usuário guardado ilegível: o check() já trata */
        }
    }
}

function iguais(a: number[] | null, b: number[] | null): boolean {
    if (a === null || b === null) {
        return a === b;
    }
    return a.length === b.length && a.every((v, i) => v === b[i]);
}
