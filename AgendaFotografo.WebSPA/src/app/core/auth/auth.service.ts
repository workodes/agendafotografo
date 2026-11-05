import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AuthUtils } from 'app/core/auth/auth.utils';
import { ApiResponse } from 'app/models/ApiResponse';
import { AuthModel } from 'app/models/AuthModel';
import { Usuario } from 'app/models/entities/Usuario';
import { environment } from 'environments/environment';
import { map, Observable, of, throwError } from 'rxjs';
import { ROLE_NAMES } from '../constants/RoleNames';
import { UsuarioService } from '../services/usuario.service';

// Nome da claim de role no JWT da API (ClaimTypes.Role, sem remapeamento).
const CLAIM_ROLE = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private _authenticated: boolean = false;
    private jwtHelper: JwtHelperService = new JwtHelperService();

    constructor(
        private httpClient: HttpClient,
        private userService: UsuarioService,
    ) { }

    set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    get rememberedEmail(): string {
        return localStorage.getItem('rememberedEmail') ?? '';
    }

    signIn(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<boolean> {
        if (this._authenticated)
            return throwError(() => 'O usuário já está logado.');

        // A API espera os nomes exatos do C# (LoginModel: Email, Password).
        const body = { Email: credentials.email, Password: credentials.password };

        return this.httpClient.post<AuthModel>(environment.Auth.login, body).pipe(
            map(response => {
                // A verificação evita sessão com perfil desconhecido pelo SPA.
                if (!Object.values(ROLE_NAMES).includes(response.Role as any))
                    throw { error: 'Perfil sem acesso ao sistema.' };

                this.registrarSessao(response);

                // "Lembrar-me" só guarda o e-mail para pré-preencher o próximo login.
                if (credentials.rememberMe)
                    localStorage.setItem('rememberedEmail', credentials.email);
                else
                    localStorage.removeItem('rememberedEmail');

                return true;
            }),
        );
    }

    signOut(): Observable<any> {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('usuario');
        this._authenticated = false;
        return of(true);
    }

    // O JWT é stateless e a API não tem endpoint de revalidação: a sessão é restaurada
    // a partir do token (ainda válido) e do usuário guardado no login. Se a API derrubar a
    // sessão (usuário/assinante inativo, role alterada), o próximo request volta 401 e o
    // interceptor desloga.
    check(): Observable<boolean> {
        if (this._authenticated)
            return of(true);

        if (!this.accessToken || AuthUtils.isTokenExpired(this.accessToken)) {
            this.signOut();
            return of(false);
        }

        const salvo = localStorage.getItem('usuario');
        const usuario: Usuario = salvo ? JSON.parse(salvo) : this.usuarioDoToken();
        this._authenticated = true;
        this.userService.usuario = usuario;
        return of(true);
    }

    isAuthenticated(): boolean {
        const token = this.accessToken;
        return !!token && !this.jwtHelper.isTokenExpired(token);
    }

    getUserRole(): keyof typeof ROLE_NAMES | null {
        const token = this.accessToken;
        if (!token)
            return null;

        const payload = this.jwtHelper.decodeToken(token);
        return payload?.[CLAIM_ROLE] ?? payload?.role ?? null;
    }

    // Rota inicial de cada role: /<role em minúsculas>/inicio (Admin -> /admin/inicio, Assinante -> /assinante/inicio)
    getRotaInicial(): string {
        const role = this.getUserRole();
        return role ? `/${role.toLowerCase()}/inicio` : '/sign-in';
    }

    private usuarioDoToken(): Usuario {
        const p = this.jwtHelper.decodeToken(this.accessToken) ?? {};
        const claim = (curto: string, longo: string) => p[curto] ?? p[`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/${longo}`];
        return {
            Id: claim('nameid', 'nameidentifier'),
            FullName: claim('unique_name', 'name'),
            Email: claim('email', 'emailaddress'),
            Role: this.getUserRole() ?? undefined,
        };
    }

    private registrarSessao(response: AuthModel): void {
        this.accessToken = response.Token;

        const usuario: Usuario = {
            Id: response.Id,
            FullName: response.FullName,
            Email: response.Email,
            Role: response.Role,
            ExigirTrocaSenha: response.ExigirTrocaSenha === true,
            AssinanteNome: response.AssinanteNome ?? null,
        };
        localStorage.setItem('usuario', JSON.stringify(usuario));

        this._authenticated = true;
        this.userService.usuario = usuario;
    }

    /**
     * Zera o flag de troca obrigatória (após AlterarSenha com sucesso): atualiza o localStorage e o `usuario$`.
     */
    ConcluirTrocaSenha(): void {
        const salvo = localStorage.getItem('usuario');
        if (!salvo)
            return;

        const usuario: Usuario = { ...JSON.parse(salvo), ExigirTrocaSenha: false };
        localStorage.setItem('usuario', JSON.stringify(usuario));
        this.userService.usuario = usuario;
    }

    /**
     * Altera a senha do usuário logado. Em erro 400 o corpo é texto puro (mensagens separadas por \n).
     */
    AlterarSenha(body: { SenhaAtual: string; NovaSenha: string }): Observable<ApiResponse> {
        return this.httpClient.post<ApiResponse>(environment.Auth.alterarSenha, body, {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
