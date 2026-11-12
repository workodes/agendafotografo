import { Injectable, NgZone } from '@angular/core';
import { Observable, Subject } from 'rxjs';

// Tipagem mínima local do Google Identity Services (sem pacote npm).
interface GoogleCredencial { credential?: string }
interface GoogleId {
    initialize(config: { client_id: string; callback: (r: GoogleCredencial) => void; auto_select?: boolean; ux_mode?: 'popup' | 'redirect' }): void;
    renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
}
interface JanelaGoogle { google?: { accounts?: { id?: GoogleId } } }

const URL_GSI = 'https://accounts.google.com/gsi/client';

/**
 * Google Identity Services: só o botão oficial (popup, sem One Tap). O Client ID vem do
 * `ConfiguracaoLogin` da API (nunca do código). A credencial (ID token) é só repassada
 * por `credencial$`: quem recebe a mantém em memória e a API a valida.
 */
@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
    private _credencial = new Subject<string>();
    private _scriptPromise?: Promise<boolean>;
    private _clientIdInicializado?: string;

    /** Emite o ID token quando a pessoa escolhe a conta no botão. */
    readonly credencial$: Observable<string> = this._credencial.asObservable();

    constructor(private _zone: NgZone) { }

    /** Carrega o script uma vez por página. Devolve false se não carregou (bloqueado, offline). */
    carregar(): Promise<boolean> {
        const w = window as unknown as JanelaGoogle;
        if (w.google?.accounts?.id)
            return Promise.resolve(true);

        this._scriptPromise ??= new Promise<boolean>(resolve => {
            const script = document.createElement('script');
            script.src = URL_GSI;
            script.async = true;
            script.onload = () => resolve(!!(window as unknown as JanelaGoogle).google?.accounts?.id);
            script.onerror = () => {
                // Permite tentar de novo se a pessoa voltar à tela.
                script.remove();
                this._scriptPromise = undefined;
                resolve(false);
            };
            document.head.appendChild(script);
        });
        return this._scriptPromise;
    }

    /** Inicializa (uma vez) e desenha o botão oficial no contêiner. Devolve false se indisponível. */
    async desenharBotao(clientId: string, conteiner: HTMLElement, texto: 'signin_with' | 'continue_with'): Promise<boolean> {
        if (!(await this.carregar()))
            return false;

        const gsi = (window as unknown as JanelaGoogle).google!.accounts!.id!;
        if (this._clientIdInicializado !== clientId) {
            gsi.initialize({
                client_id: clientId,
                auto_select: false,
                ux_mode: 'popup',
                callback: r => this._zone.run(() => {
                    if (r.credential)
                        this._credencial.next(r.credential);
                }),
            });
            this._clientIdInicializado = clientId;
        }

        conteiner.innerHTML = '';
        gsi.renderButton(conteiner, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: texto,
            shape: 'rectangular',
            logo_alignment: 'left',
            locale: 'pt-BR',
            width: Math.max(200, Math.min(400, Math.floor(conteiner.getBoundingClientRect().width) || 320)),
        });
        return true;
    }
}
