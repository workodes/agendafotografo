import { TextFieldModule } from '@angular/cdk/text-field';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FuseDrawerComponent } from '@fuse/components/drawer';
import { ChatImagemModel } from 'app/models/DTOs/requests/ChatEnviarModel';
import { EventoResumo } from 'app/models/DTOs/responses/EventoResumo';
import { ChatStatus } from 'app/models/DTOs/responses/ChatStatus';
import { ChatMensagem } from 'app/models/entities/ChatMensagem';
import { PapelChat } from 'app/models/enums/PapelChat';
import { FecharComEscDirective } from 'app/modules/shared/directives/fechar-com-esc.directive';
import { ChatService, LIMITE_TEXTO } from 'app/services/chat.service';
import { STATUS_EVENTO_COR, STATUS_EVENTO_ROTULO } from 'app/models/enums/StatusEvento';
import { linhaEventoResumo } from 'app/utils/evento-resumo';
import { reduzirImagem } from 'app/utils/imagem';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { abrirRota } from 'app/utils/navegar';
import { Subject, finalize, takeUntil } from 'rxjs';
import { AssistenteRascunhoComponent } from './assistente-rascunho/assistente-rascunho.component';

// Assistente com IA do Assinante: painel lateral no estilo do "Team Chat" (quick chat) do Fuse, sem contatos, sobre o FuseDrawer.
// A partir de `lg` há uma faixa fixa à direita (o layout reserva o espaço com lg:pr-16); abaixo disso, um botão flutuante abre o
// painel (tela cheia abaixo de `sm`). Sem rota, sem item de menu e sem atalho no cabeçalho. O texto do chat é sempre interpolado
// (nunca innerHTML). A IA só propõe: quem grava é o card do rascunho.
@Component({
    selector: 'assistente',
    templateUrl: './assistente.component.html',
    styleUrls: ['./assistente.component.scss'],
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        NgClass, NgFor, NgIf, FormsModule, TextFieldModule, MatButtonModule, MatIconModule,
        FuseDrawerComponent, FecharComEscDirective, AssistenteRascunhoComponent,
    ],
})
export class AssistenteComponent implements OnInit, OnDestroy {
    @ViewChild('lista') private _lista?: ElementRef<HTMLElement>;
    @ViewChild('campo') private _campo?: ElementRef<HTMLTextAreaElement>;

    readonly papel = PapelChat;
    readonly limiteTexto = LIMITE_TEXTO;
    readonly statusRotulo = STATUS_EVENTO_ROTULO;
    readonly statusCor = STATUS_EVENTO_COR;
    readonly linhaResumo = linhaEventoResumo;

    aberto = false;
    texto = '';
    enviando = false;
    /** Aviso do que impede o envio (limite de tamanho da conversa); some ao editar o texto. */
    aviso = '';
    status: ChatStatus | null = null;
    /** Imagem anexada e ainda não enviada (pré-visualização). O Base64 fica só aqui, em memória. */
    imagem: { Url: string; Dados: ChatImagemModel } | null = null;
    anexando = false;
    /** Miniaturas abertas em tamanho maior no painel. */
    ampliadas = new Set<ChatMensagem>();
    private _limiteAtingido = false;
    private _destroy$ = new Subject<void>();

    constructor(private _chat: ChatService, private _router: Router, private _route: ActivatedRoute) { }

    get mensagens(): ChatMensagem[] {
        return this._chat.mensagens;
    }

    /** Há um card confirmando: Nova conversa fica bloqueado (apagaria a conversa no meio da gravação). */
    get confirmando(): boolean {
        return this._chat.confirmando > 0;
    }

    miniatura(m: ChatMensagem): string | undefined {
        return this._chat.Miniatura(m);
    }

    alternarAmpliada(m: ChatMensagem): void {
        this.ampliadas.has(m) ? this.ampliadas.delete(m) : this.ampliadas.add(m);
    }

    abrirEvento(e: EventoResumo, event: MouseEvent): void {
        abrirRota(this._router, this._route, ['/assinante/eventos', e.Id], event);
        if (event.type === 'click' && !event.ctrlKey && !event.metaKey) {
            this.fechar();
        }
    }

    /** Estourou o limite diário (429 ou contador cheio): o campo fica desabilitado até o dia seguinte. */
    get bloqueado(): boolean {
        const s = this.status;
        return this._limiteAtingido || (!!s && s.LimiteDiario > 0 && s.UsadasHoje >= s.LimiteDiario);
    }

    ngOnInit(): void {
        this._chat.status$.pipe(takeUntil(this._destroy$)).subscribe(s => (this.status = s));
    }

    ngOnDestroy(): void {
        this.descartarImagem();
        this._chat.RevogarMiniaturas();
        this._destroy$.next();
        this._destroy$.complete();
    }

    abrir(): void {
        this.aberto = true;
        this.rolarParaOFim();
        setTimeout(() => this._campo?.nativeElement.focus(), 450);
    }

    fechar(): void {
        this.aberto = false;
    }

    /** ESC fecha o painel, se estiver aberto. */
    aoEsc(): void {
        if (this.aberto) {
            this.fechar();
        }
    }

    novaConversa(): void {
        if (this.enviando || this.confirmando) {
            return;
        }
        this.descartarImagem();
        this.ampliadas.clear();
        this._chat.Limpar();
        this.texto = '';
        this.aviso = '';
        this._campo?.nativeElement.focus();
    }

    aoTeclar(event: Event): void {
        const e = event as KeyboardEvent;
        // Enter envia; Shift+Enter quebra a linha. Não interfere na composição (IME).
        if (!e.shiftKey && !e.isComposing) {
            e.preventDefault();
            this.enviar();
        }
    }

    // ---- Imagem do flyer ----

    aoEscolherArquivo(event: Event): void {
        const input = event.target as HTMLInputElement;
        const arquivo = input.files?.[0];
        input.value = ''; // permite escolher o mesmo arquivo de novo
        if (arquivo) {
            void this.anexar(arquivo);
        }
    }

    /** Colar uma imagem (print) no campo anexa a imagem; texto colado segue o caminho normal. */
    aoColar(event: ClipboardEvent): void {
        if (this.enviando || this.bloqueado) {
            return;
        }
        const item = Array.from(event.clipboardData?.items ?? []).find(i => i.kind === 'file' && i.type.startsWith('image/'));
        const arquivo = item?.getAsFile();
        if (arquivo) {
            event.preventDefault();
            void this.anexar(arquivo);
        }
    }

    removerImagem(): void {
        this.descartarImagem();
        this.aviso = '';
    }

    /** Uma imagem por mensagem: anexar outra substitui a anterior. */
    private async anexar(arquivo: File): Promise<void> {
        this.aviso = '';
        this.anexando = true;
        try {
            const r = await reduzirImagem(arquivo);
            this.descartarImagem();
            this.imagem = { Url: URL.createObjectURL(r.Blob), Dados: { MediaType: r.MediaType, Base64: r.Base64 } };
        } catch (e) {
            this.aviso = e instanceof Error ? e.message : 'Não consegui ler esta imagem. Envie JPG, PNG ou um print.';
        } finally {
            this.anexando = false;
        }
    }

    private descartarImagem(): void {
        if (this.imagem) {
            URL.revokeObjectURL(this.imagem.Url);
            this.imagem = null;
        }
    }

    enviar(): void {
        const texto = this.texto.trim();
        const imagem = this.imagem;
        if ((!texto && !imagem) || this.enviando || this.anexando || this.bloqueado) {
            return;
        }
        const problema = this._chat.ValidarEnvio(texto);
        if (problema) {
            this.aviso = problema;
            return;
        }

        this.aviso = '';
        // Avisos de sistema antigos saem da conversa a cada nova tentativa.
        this.mensagens.filter(m => m.Sistema).forEach(m => this._chat.Remover(m));
        const usuario: ChatMensagem = { Papel: PapelChat.Usuario, Texto: texto };
        if (imagem) {
            // No storage vai só a marca; a miniatura (object URL) fica em memória no ChatService.
            usuario.TemImagem = true;
        }
        this._chat.Adicionar(usuario);
        if (imagem) {
            this._chat.GuardarMiniatura(usuario, imagem.Url);
            this.imagem = null;
        }
        this.texto = '';
        this.enviando = true;
        this.rolarParaOFim();

        this._chat.Enviar(this._chat.Historico(imagem?.Dados)).pipe(
            finalize(() => {
                this.enviando = false;
                this._chat.AtualizarContador();
                this.rolarParaOFim();
            }),
        ).subscribe({
            next: resposta => {
                this._chat.Adicionar({
                    Papel: PapelChat.Assistente,
                    Texto: resposta.Texto ?? '',
                    Rascunho: resposta.Rascunho ?? null,
                    Eventos: resposta.Eventos?.length ? resposta.Eventos : null,
                });
            },
            error: error => {
                // A tentativa falhou: texto e imagem voltam para o campo (se ainda estiverem vazios) e o motivo aparece na conversa.
                const url = this._chat.TirarMiniatura(usuario);
                this._chat.Remover(usuario);
                if (!this.texto) {
                    this.texto = texto;
                }
                if (imagem) {
                    if (!this.imagem) {
                        this.imagem = { Url: url ?? imagem.Url, Dados: imagem.Dados };
                    } else if (url) {
                        URL.revokeObjectURL(url);
                    }
                }
                if (error?.status === 429) {
                    this._limiteAtingido = true;
                }
                const padrao = error?.status === 413
                    ? 'A mensagem é grande demais. Reduza o texto ou comece uma nova conversa.'
                    : 'Não foi possível falar com o assistente agora. Tente de novo.';
                this.mensagens.push({ Papel: PapelChat.Assistente, Texto: mensagemErro(error, padrao), Sistema: true });
            },
        });
    }

    /** Depois de pintar, leva a lista para a última mensagem. */
    private rolarParaOFim(): void {
        setTimeout(() => {
            const el = this._lista?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        });
    }
}
