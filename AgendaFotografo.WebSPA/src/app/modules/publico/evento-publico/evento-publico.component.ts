import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { EventoPublico } from 'app/models/DTOs/responses/EventoPublico';
import { FUNCAO_MEMBRO_ROTULO } from 'app/models/enums/FuncaoMembro';
import { TipoArquivoEvento } from 'app/models/enums/TipoArquivoEvento';
import { LinkPublicoService } from 'app/services/link-publico.service';
import { extrairMensagemErroBlob } from 'app/utils/blob-error.util';
import { MapaGpxComponent } from 'app/modules/shared/components/mapa-gpx/mapa-gpx.component';
import { Observable, EMPTY } from 'rxjs';
import { diaSemana, formatarData, formatarHora, parseDataIso } from 'app/utils/data-evento';
import { AcessoGuardado, apagarAcesso, guardarAcesso, lerAcesso, linkMaps, obterAparelho, urlSegura } from 'app/utils/link-publico';
import { localCidade } from 'app/utils/local-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';

type Estado = 'carregando' | 'codigo' | 'evento' | 'indisponivel' | 'erro';

const TOKEN_VALIDO = /^[0-9a-f]{32}$/;

// Página pública do evento (/e/:token). Anônima e mobile-first: antes do código não mostra nada do evento.
// Textos só por interpolação (nunca innerHTML); links externos só http/https; blobs revogados ao sair.
@Component({
    standalone: true,
    selector: 'app-evento-publico',
    templateUrl: './evento-publico.component.html',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MapaGpxComponent],
})
export class EventoPublicoComponent implements OnInit, OnDestroy {
    private _route = inject(ActivatedRoute);
    private _service = inject(LinkPublicoService);
    private _meta = inject(Meta);
    private _title = inject(Title);

    @ViewChild('campoCodigo') campoCodigo?: ElementRef<HTMLInputElement>;

    readonly token = (this._route.snapshot.paramMap.get('token') ?? '').trim().toLowerCase();
    estado: Estado = 'carregando';
    evento?: EventoPublico;
    acesso: AcessoGuardado | null = null;

    // Tela do código
    codigo = '';
    mensagemCodigo = '';
    aviso = '';
    bloqueado = false;
    verificando = false;

    // Erro (rede ou limite de requisições)
    mensagemErroPagina = '';
    private _retomar: 'evento' | 'codigo' = 'evento';

    // Imagens e GPX
    flyerUrl: string | null = null;
    rotaUrl: string | null = null;
    flyerFalhou = false;
    rotaFalhou = false;
    baixandoGpx = false;
    mensagemGpx = '';

    funcaoRotulo = FUNCAO_MEMBRO_ROTULO;

    ngOnInit(): void {
        this._title.setTitle('Evento');
        this._meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
        this._meta.updateTag({ name: 'referrer', content: 'no-referrer' });

        if (!TOKEN_VALIDO.test(this.token)) {
            this.estado = 'indisponivel';
            return;
        }
        this.acesso = lerAcesso(this.token);
        if (this.acesso) {
            this.carregarEvento();
        } else {
            this.mostrarCodigo();
        }
    }

    ngOnDestroy(): void {
        this._meta.removeTag('name="robots"');
        this._meta.removeTag('name="referrer"');
        this.revogarImagens();
    }

    // ---- Derivados ----

    get tituloData(): string {
        const e = this.evento;
        const s = diaSemana(e?.EVE_DATA);
        const dia = s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}, ${formatarData(e?.EVE_DATA)}` : formatarData(e?.EVE_DATA);
        return `${dia} · ${e?.EVE_HORA ? formatarHora(e.EVE_HORA) : 'Hora a confirmar'}`;
    }

    get localCidade(): string {
        return localCidade(this.evento);
    }

    get expiraEm(): string {
        const t = Date.parse(this.acesso?.ExpiraEm ?? '');
        if (isNaN(t)) {
            return '';
        }
        const d = new Date(t);
        return formatarData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }

    get temLargada(): boolean {
        return !!(this.evento?.EVE_LARGADA_LOCAL?.trim() || urlSegura(this.evento?.EVE_LARGADA_LINK));
    }

    get temChegada(): boolean {
        return !!(this.evento?.EVE_CHEGADA_LOCAL?.trim() || urlSegura(this.evento?.EVE_CHEGADA_LINK));
    }

    get temRota(): boolean {
        const e = this.evento;
        return !!(e?.TemImagemRota || e?.GpxNome || urlSegura(e?.EVE_ROTA_LINK_MAPS) || urlSegura(e?.EVE_ROTA_LINK_STRAVA));
    }

    get linkFotos(): string | null {
        return urlSegura(this.evento?.EVE_LINK_FOTOS);
    }

    get linkLargada(): string | null {
        return linkMaps(this.evento?.EVE_LARGADA_LOCAL, this.evento?.EVE_LARGADA_LINK, this.evento?.EVE_CIDADE);
    }

    get linkChegada(): string | null {
        return linkMaps(this.evento?.EVE_CHEGADA_LOCAL, this.evento?.EVE_CHEGADA_LINK, this.evento?.EVE_CIDADE);
    }

    get linkRotaMaps(): string | null {
        return urlSegura(this.evento?.EVE_ROTA_LINK_MAPS);
    }

    get linkStrava(): string | null {
        return urlSegura(this.evento?.EVE_ROTA_LINK_STRAVA);
    }

    // ---- Fluxo ----

    tentarDeNovo(): void {
        if (this._retomar === 'codigo') {
            this.mostrarCodigo();
        } else {
            this.carregarEvento();
        }
    }

    private mostrarCodigo(aviso = ''): void {
        this.estado = 'codigo';
        this.aviso = aviso;
        this.codigo = '';
        this.mensagemCodigo = '';
        setTimeout(() => this.campoCodigo?.nativeElement.focus());
    }

    private carregarEvento(): void {
        if (!this.acesso) {
            this.mostrarCodigo();
            return;
        }
        this.estado = 'carregando';
        this._service.Evento(this.token, this.acesso.Acesso).subscribe({
            next: evento => {
                this.evento = evento;
                this.estado = 'evento';
                this._title.setTitle(evento.EVE_NOME);
                this.carregarImagens();
            },
            error: error => {
                if (error?.status === 403) {
                    apagarAcesso(this.token);
                    this.acesso = null;
                    this.mostrarCodigo('Seu acesso expirou ou o código mudou. Digite o código atual.');
                } else if (error?.status === 404) {
                    this.estado = 'indisponivel';
                } else {
                    this._retomar = 'evento';
                    this.mensagemErroPagina = mensagemErro(error, 'Não foi possível carregar o evento. Verifique sua conexão.');
                    this.estado = 'erro';
                }
            },
        });
    }

    aoDigitar(input: HTMLInputElement): void {
        const digitos = input.value.replace(/\D/g, '').slice(0, 4);
        input.value = digitos;
        this.codigo = digitos;
        if (digitos.length === 4) {
            this.entrar();
        }
    }

    entrar(): void {
        if (this.verificando || this.bloqueado) {
            return;
        }
        if (!/^\d{4}$/.test(this.codigo)) {
            this.mensagemCodigo = 'Digite o código de 4 números.';
            return;
        }
        this.verificando = true;
        this.mensagemCodigo = '';
        this.aviso = '';
        this._service.Acessar({ Token: this.token, Codigo: this.codigo }, obterAparelho()).subscribe({
            next: r => {
                this.verificando = false;
                this.acesso = { Acesso: r.Acesso, ExpiraEm: r.ExpiraEm };
                guardarAcesso(this.token, this.acesso);
                this.codigo = '';
                this.carregarEvento();
            },
            error: error => {
                this.verificando = false;
                if (error?.status === 404) {
                    this.estado = 'indisponivel';
                    return;
                }
                this.codigo = '';
                this.mensagemCodigo = mensagemErro(error, 'Não foi possível verificar o código. Tente de novo.');
                if (error?.status === 429) {
                    this.bloqueado = true;
                    // Limite geral (por minuto) libera sozinho; o bloqueio por tentativas só some após os 15 min.
                    if (/requisi/i.test(this.mensagemCodigo)) {
                        setTimeout(() => { this.bloqueado = false; this.mensagemCodigo = ''; }, 60000);
                    }
                } else {
                    setTimeout(() => this.campoCodigo?.nativeElement.focus());
                }
            },
        });
    }

    // ---- Imagens e GPX (blobs com o acesso; nunca URL direta da API) ----

    private carregarImagens(): void {
        this.revogarImagens();
        if (!this.acesso || !this.evento) {
            return;
        }
        if (this.evento.TemFlyer) {
            this.baixarImagem(TipoArquivoEvento.Flyer, url => this.flyerUrl = url, () => this.flyerFalhou = true);
        }
        if (this.evento.TemImagemRota) {
            this.baixarImagem(TipoArquivoEvento.ImagemRota, url => this.rotaUrl = url, () => this.rotaFalhou = true);
        }
    }

    private baixarImagem(tipo: number, ok: (url: string) => void, falha: () => void): void {
        const acesso = this.acesso;
        if (!acesso) {
            return;
        }
        this._service.Arquivo(this.token, tipo, acesso.Acesso).subscribe({
            next: blob => {
                if (this.estado !== 'evento') {
                    return;
                }
                ok(URL.createObjectURL(blob));
            },
            error: () => falha(),
        });
    }

    private revogarImagens(): void {
        if (this.flyerUrl) {
            URL.revokeObjectURL(this.flyerUrl);
        }
        if (this.rotaUrl) {
            URL.revokeObjectURL(this.rotaUrl);
        }
        this.flyerUrl = null;
        this.rotaUrl = null;
        this.flyerFalhou = false;
        this.rotaFalhou = false;
    }

    // Fonte do GPX para o mapa (mesmo blob do download, com o acesso guardado; nada é enviado a terceiros).
    carregarGpx = (): Observable<Blob> => this.acesso ? this._service.Arquivo(this.token, TipoArquivoEvento.Gpx, this.acesso.Acesso) : EMPTY;

    baixarGpx(): void {
        if (!this.acesso || !this.evento?.GpxNome || this.baixandoGpx) {
            return;
        }
        const nome = this.evento.GpxNome;
        this.baixandoGpx = true;
        this.mensagemGpx = '';
        this._service.Arquivo(this.token, TipoArquivoEvento.Gpx, this.acesso.Acesso).subscribe({
            next: blob => {
                this.baixandoGpx = false;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nome;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            error: async error => {
                this.baixandoGpx = false;
                this.mensagemGpx = await extrairMensagemErroBlob(error, 'Não foi possível baixar o GPX.');
            },
        });
    }

    // Data do cabeçalho inválida não deve quebrar a página.
    get dataValida(): boolean {
        return !!parseDataIso(this.evento?.EVE_DATA);
    }
}
