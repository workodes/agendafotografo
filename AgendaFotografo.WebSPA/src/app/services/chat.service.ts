import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, shareReplay, tap } from 'rxjs';
import { ChatEnviarModel, ChatImagemModel, ChatMensagemItem } from 'app/models/DTOs/requests/ChatEnviarModel';
import { ChatEnviarResponse } from 'app/models/DTOs/responses/ChatEnviarResponse';
import { ChatRascunho } from 'app/models/DTOs/responses/ChatRascunho';
import { ChatStatus } from 'app/models/DTOs/responses/ChatStatus';
import { Opcao } from 'app/models/DTOs/responses/Opcao';
import { ChatMensagem } from 'app/models/entities/ChatMensagem';
import { PapelChat } from 'app/models/enums/PapelChat';
import { OrganizadorService } from 'app/services/organizador.service';
import { TipoEventoService } from 'app/services/tipo-evento.service';
import { environment } from 'environments/environment';

/** Chave do sessionStorage com a conversa (sobrevive ao F5 na mesma aba; apagada no sign-out). */
export const CHAVE_CONVERSA = 'agf_assistente_conversa';

/** Limites da API (a validação de verdade é dela; aqui só avisamos antes de enviar). */
export const LIMITE_MENSAGENS = 20;
export const LIMITE_TEXTO = 2000;
export const LIMITE_TOTAL = 12000;

/** No histórico, a mensagem que levou imagem (e não é a última) vai só com o texto e este marcador. */
export const MARCADOR_IMAGEM = '[imagem do flyer enviada]';

export interface ChatOpcoes {
    tipos: Opcao[];
    organizadores: Opcao[];
}

// Assistente com IA (api/Chat/*). Guarda o estado da conversa (memória + sessionStorage) e o status ligado/limite.
@Injectable({ providedIn: 'root' })
export class ChatService {
    private readonly _headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    private readonly _status = new BehaviorSubject<ChatStatus | null>(null);
    private _mensagens: ChatMensagem[] = this.ler();
    private _opcoes$?: Observable<ChatOpcoes>;
    /** Miniaturas das imagens enviadas (object URLs), só em memória: depois do F5 a bolha mostra o chip "Imagem enviada". */
    private _miniaturas = new Map<ChatMensagem, string>();
    private _confirmando = 0;

    /** null = ainda não consultou; `Ligado` false = desligado (falha na consulta conta como desligado). */
    readonly status$ = this._status.asObservable();

    constructor(
        private _httpClient: HttpClient,
        private _tipoEventoService: TipoEventoService,
        private _organizadorService: OrganizadorService,
    ) { }

    get mensagens(): ChatMensagem[] {
        return this._mensagens;
    }

    get status(): ChatStatus | null {
        return this._status.value;
    }

    /** Quantos cards estão confirmando agora (Nova conversa fica bloqueado enquanto > 0). */
    get confirmando(): number {
        return this._confirmando;
    }

    IniciarConfirmacao(): void {
        this._confirmando++;
    }

    EncerrarConfirmacao(): void {
        this._confirmando = Math.max(0, this._confirmando - 1);
    }

    // ---- API ----

    Status(): Observable<ChatStatus> {
        return this._httpClient.get<ChatStatus>(environment.Chat.status).pipe(tap(s => this._status.next(s)));
    }

    /** Consulta o status uma vez (layout do Assinante). Falha = desligado, sem erro na tela. */
    CarregarStatus(): void {
        this.Status().pipe(catchError(() => {
            this._status.next({ Ligado: false, LimiteDiario: 0, UsadasHoje: 0 });
            return of(null);
        })).subscribe();
    }

    /** Atualiza só o contador "N de X mensagens hoje", sem derrubar o painel se falhar. */
    AtualizarContador(): void {
        this.Status().pipe(catchError(() => of(null))).subscribe();
    }

    Enviar(mensagens: ChatMensagemItem[]): Observable<ChatEnviarResponse> {
        const corpo: ChatEnviarModel = { Mensagens: mensagens };
        return this._httpClient.post<ChatEnviarResponse>(environment.Chat.enviar, corpo, { headers: this._headers });
    }

    /** Tipos e organizadores ativos (combos do card), consultados uma vez por conversa. */
    Opcoes(): Observable<ChatOpcoes> {
        if (!this._opcoes$) {
            this._opcoes$ = forkJoin({
                tipos: this._tipoEventoService.Opcoes(true),
                organizadores: this._organizadorService.Opcoes(true),
            }).pipe(
                map(r => r as ChatOpcoes),
                catchError(erro => {
                    this._opcoes$ = undefined; // tenta de novo na próxima vez
                    throw erro;
                }),
                shareReplay(1),
            );
        }
        return this._opcoes$;
    }

    // ---- Conversa ----

    /**
     * Histórico a enviar à API: sem avisos de sistema, sem Eventos/Semelhantes e só com o rascunho vigente (no estado atual do card).
     * A imagem atual (`imagem`) vai só na última mensagem; nas anteriores com imagem vai o texto com o marcador.
     */
    Historico(imagem?: ChatImagemModel | null): ChatMensagemItem[] {
        const lista = this._mensagens.filter(m => !m.Sistema);
        return lista.map((m, i) => {
            const ultima = i === lista.length - 1;
            if (m.Papel === PapelChat.Usuario) {
                if (ultima && imagem) {
                    return { Papel: m.Papel, Texto: m.Texto, Imagem: imagem };
                }
                return { Papel: m.Papel, Texto: m.TemImagem ? this.comMarcador(m.Texto) : m.Texto };
            }
            const rascunho = this.RascunhoVigente(m) ? this.rascunhoEnxuto(m.Rascunho) : null;
            return rascunho ? { Papel: m.Papel, Texto: m.Texto, Rascunho: rascunho } : { Papel: m.Papel, Texto: m.Texto };
        });
    }

    private comMarcador(texto: string): string {
        const t = (texto ?? '').trim();
        return t ? `${t.substring(0, LIMITE_TEXTO - MARCADOR_IMAGEM.length - 1)} ${MARCADOR_IMAGEM}` : MARCADOR_IMAGEM;
    }

    /** Rascunho ainda confirmável: sem lançamento e sem nenhuma resposta posterior do assistente trazendo outro rascunho. */
    RascunhoVigente(mensagem: ChatMensagem): boolean {
        if (!mensagem.Rascunho || mensagem.Lancamento) {
            return false;
        }
        const i = this._mensagens.indexOf(mensagem);
        return i < 0 || !this._mensagens.slice(i + 1).some(m => m.Papel === PapelChat.Assistente && !m.Sistema && !!m.Rascunho);
    }

    /** Rascunho para o histórico: sem OutrosEventos dos membros, sem Semelhantes (a API não precisa) e nunca com data inválida (omite o rascunho). */
    private rascunhoEnxuto(r: ChatRascunho | null | undefined): ChatRascunho | null {
        if (!r?.Evento || !/^\d{4}-\d{2}-\d{2}$/.test(r.Evento.EVE_DATA ?? '')) {
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { Semelhantes, ...resto } = r;
        return { ...resto, Membros: (r.Membros ?? []).map(m => ({ ...m, OutrosEventos: [] })) };
    }

    /** Mensagem de erro (pt-BR) se a conversa, com o novo texto do usuário, passar de algum limite da API; null se couber. */
    ValidarEnvio(novoTexto: string): string | null {
        if (novoTexto.length > LIMITE_TEXTO) {
            return `Cada mensagem pode ter no máximo ${LIMITE_TEXTO} caracteres.`;
        }
        const historico = this.Historico();
        if (historico.length + 1 > LIMITE_MENSAGENS) {
            return `A conversa pode ter no máximo ${LIMITE_MENSAGENS} mensagens. Clique em "Nova conversa" para continuar.`;
        }
        const total = historico.reduce((soma, m) => soma + m.Texto.length, 0) + novoTexto.length;
        if (total > LIMITE_TOTAL) {
            return `A conversa pode ter no máximo ${LIMITE_TOTAL} caracteres. Clique em "Nova conversa" para continuar.`;
        }
        return null;
    }

    Adicionar(mensagem: ChatMensagem): void {
        this._mensagens.push(mensagem);
        this.Persistir();
    }

    // ---- Miniaturas das imagens enviadas (só em memória) ----

    GuardarMiniatura(mensagem: ChatMensagem, url: string): void {
        this._miniaturas.set(mensagem, url);
    }

    Miniatura(mensagem: ChatMensagem): string | undefined {
        return this._miniaturas.get(mensagem);
    }

    /** Devolve a miniatura sem revogar (a imagem volta para a pré-visualização depois de um erro de envio). */
    TirarMiniatura(mensagem: ChatMensagem): string | undefined {
        const url = this._miniaturas.get(mensagem);
        this._miniaturas.delete(mensagem);
        return url;
    }

    RevogarMiniaturas(): void {
        this._miniaturas.forEach(url => URL.revokeObjectURL(url));
        this._miniaturas.clear();
    }

    Remover(mensagem: ChatMensagem): void {
        const url = this._miniaturas.get(mensagem);
        if (url) {
            URL.revokeObjectURL(url);
            this._miniaturas.delete(mensagem);
        }
        this._mensagens = this._mensagens.filter(m => m !== mensagem);
        this.Persistir();
    }

    /** Regrava a conversa no sessionStorage (chamar a cada mudança: edição do card, lançamento etc.). Avisos de sistema não são guardados. */
    Persistir(): void {
        try {
            const guardar = this._mensagens.filter(m => !m.Sistema);
            sessionStorage.setItem(CHAVE_CONVERSA, JSON.stringify(guardar));
        } catch {
            // storage cheio ou bloqueado: a conversa continua em memória
        }
    }

    /** Apaga a conversa (botão "Nova conversa" e sign-out). `zerarStatus` também esquece o status (sign-out). */
    Limpar(zerarStatus = false): void {
        this.RevogarMiniaturas();
        this._mensagens = [];
        this._opcoes$ = undefined;
        try {
            sessionStorage.removeItem(CHAVE_CONVERSA);
        } catch {
            // ignora
        }
        if (zerarStatus) {
            this._status.next(null);
        }
    }

    private ler(): ChatMensagem[] {
        try {
            const bruto = sessionStorage.getItem(CHAVE_CONVERSA);
            const lista = bruto ? JSON.parse(bruto) : [];
            return Array.isArray(lista)
                ? lista.filter(m => m && typeof m.Texto === 'string' && (m.Papel === PapelChat.Usuario || m.Papel === PapelChat.Assistente))
                : [];
        } catch {
            return [];
        }
    }
}
