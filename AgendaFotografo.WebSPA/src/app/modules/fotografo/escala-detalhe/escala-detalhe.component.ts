import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { EscalaEventoModel } from 'app/models/DTOs/responses/EscalaEventoModel';
import { TipoArquivoEvento } from 'app/models/enums/TipoArquivoEvento';
import { MapaGpxComponent } from 'app/modules/shared/components/mapa-gpx/mapa-gpx.component';
import { AuthService } from 'app/core/auth/auth.service';
import { EscalaCoordenadorService } from 'app/services/escala-coordenador.service';
import { EscalaService } from 'app/services/escala.service';
import { diaSemana, formatarData, formatarHora, parseDataIso } from 'app/utils/data-evento';
import { linkMaps, urlSegura } from 'app/utils/link-publico';
import { localCidade } from 'app/utils/local-evento';
import { mensagemErro } from 'app/utils/mensagem-erro';

type Estado = 'carregando' | 'evento' | 'naoEncontrado' | 'erro';

/**
 * Evento em que um coordenador escalou o Fotógrafo (plano 20, Parte B): tela SOMENTE LEITURA no visual do link público.
 * Plano 23: o mesmo componente serve o Assinante (coordenador escalado por outro coordenador, `/assinante/escalas/:id`);
 * o service e a rota de volta saem do perfil da sessão. (Mover para `modules/shared` fica para depois.)
 * Mostra só o que a API devolve (lista branca). Só interpolação (nunca innerHTML); links externos só http/https;
 * a imagem da rota vem por blob autenticado e é revogada ao sair.
 */
@Component({
    selector: 'escala-detalhe',
    templateUrl: './escala-detalhe.component.html',
    standalone: true,
    host: { class: 'flex flex-col flex-auto w-full min-w-0 min-h-0' },
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MapaGpxComponent],
})
export class EscalaDetalheComponent implements OnInit, OnDestroy {
    estado: Estado = 'carregando';
    evento: EscalaEventoModel | null = null;
    mensagemErroPagina = '';
    rotaUrl: string | null = null;
    rotaFalhou = false;
    flyerUrl: string | null = null;
    flyerFalhou = false;

    private _id = '';
    private _destroy$ = new Subject<void>();

    constructor(
        private _route: ActivatedRoute,
        private _router: Router,
        private _escalaFotografo: EscalaService,
        private _escalaCoordenador: EscalaCoordenadorService,
        private _auth: AuthService,
        private _title: Title,
        private _cdr: ChangeDetectorRef,
    ) { }

    /** Perfil da sessão: o coordenador usa `EscalaCoordenador/*` e volta para `/assinante/agenda`; o fotógrafo, `Escala/*` e `/fotografo/agenda`. */
    private get _ehAssinante(): boolean {
        return this._auth.getUserRole() === 'Assinante';
    }

    private get _service(): EscalaService | EscalaCoordenadorService {
        return this._ehAssinante ? this._escalaCoordenador : this._escalaFotografo;
    }

    ngOnInit(): void {
        this._title.setTitle('Evento');
        this._route.paramMap.pipe(takeUntil(this._destroy$)).subscribe(p => {
            this._id = p.get('id') ?? '';
            this.carregarEvento();
        });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
        this.revogarImagem();
    }

    tentarDeNovo(): void {
        this.carregarEvento();
    }

    voltar(): void {
        const dia = parseDataIso(this.evento?.EVE_DATA) ? this.evento!.EVE_DATA.substring(0, 10) : null;
        this._router.navigate([this._ehAssinante ? '/assinante/agenda' : '/fotografo/agenda'], { queryParams: dia ? { mes: dia.substring(0, 7), dia } : {} });
    }

    // ---- Derivados (links sempre passam por urlSegura/linkMaps: só http/https) ----

    get tituloData(): string {
        const e = this.evento;
        const s = diaSemana(e?.EVE_DATA);
        const dia = s ? `${s.charAt(0).toUpperCase()}${s.slice(1)}, ${formatarData(e?.EVE_DATA)}` : formatarData(e?.EVE_DATA);
        return `${dia} · ${e?.EVE_HORA ? formatarHora(e.EVE_HORA) : 'Hora a confirmar'}`;
    }

    get localCidade(): string {
        return localCidade(this.evento);
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

    get linkLocal(): string | null {
        return linkMaps(this.evento?.EVE_LOCAL, null, this.evento?.EVE_CIDADE);
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

    get linkFotos(): string | null {
        return urlSegura(this.evento?.EVE_LINK_FOTOS);
    }

    // Fonte do GPX para o mapa (blob com o Bearer; nada é enviado a terceiros).
    carregarGpx = (): Observable<Blob> => this._service.Arquivo(this._id, TipoArquivoEvento.Gpx);

    // ---- Carga ----

    private carregarEvento(): void {
        this.estado = 'carregando';
        this.revogarImagem();
        this._service.Get(this._id).pipe(takeUntil(this._destroy$)).subscribe({
            next: evento => {
                this.evento = evento;
                this.estado = 'evento';
                this._title.setTitle(evento.EVE_NOME);
                if (evento.TemImagemRota) {
                    this.baixarImagem();
                }
                if (evento.TemFlyer) {
                    this.baixarFlyer();
                }
                this._cdr.markForCheck();
            },
            error: error => {
                this.evento = null;
                if (error?.status === 404) {
                    this.estado = 'naoEncontrado';
                } else {
                    this.mensagemErroPagina = mensagemErro(error, 'Não foi possível carregar o evento. Verifique sua conexão.');
                    this.estado = 'erro';
                }
                this._cdr.markForCheck();
            },
        });
    }

    private baixarImagem(): void {
        const id = this._id;
        this._service.Arquivo(id, TipoArquivoEvento.ImagemRota).pipe(takeUntil(this._destroy$)).subscribe({
            next: blob => {
                if (this.estado !== 'evento' || id !== this._id) {
                    return;
                }
                this.revogarImagem();
                this.rotaUrl = URL.createObjectURL(blob);
                this._cdr.markForCheck();
            },
            error: () => {
                this.rotaFalhou = true;
                this._cdr.markForCheck();
            },
        });
    }

    // Flyer (plano 23, fotógrafo e coordenador): imagem por blob autenticado, revogada ao trocar de evento e ao sair.
    private baixarFlyer(): void {
        const id = this._id;
        this._service.Arquivo(id, TipoArquivoEvento.Flyer).pipe(takeUntil(this._destroy$)).subscribe({
            next: blob => {
                if (this.estado !== 'evento' || id !== this._id) {
                    return;
                }
                this.revogarFlyer();
                this.flyerUrl = URL.createObjectURL(blob);
                this._cdr.markForCheck();
            },
            error: () => {
                this.flyerFalhou = true;
                this._cdr.markForCheck();
            },
        });
    }

    private revogarImagem(): void {
        if (this.rotaUrl) {
            URL.revokeObjectURL(this.rotaUrl);
        }
        this.rotaUrl = null;
        this.rotaFalhou = false;
        this.revogarFlyer();
    }

    private revogarFlyer(): void {
        if (this.flyerUrl) {
            URL.revokeObjectURL(this.flyerUrl);
        }
        this.flyerUrl = null;
        this.flyerFalhou = false;
    }
}
