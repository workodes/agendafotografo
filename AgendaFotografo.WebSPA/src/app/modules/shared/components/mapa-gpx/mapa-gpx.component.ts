import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import * as L from 'leaflet';
import { Observable, Subscription } from 'rxjs';
import { PontoGpx, TrajetoGpx, distanciaAoTrajetoKm, lerGpx, marcasDeKm } from './mapa-gpx.util';

const MENSAGEM_INVALIDO = 'Não foi possível ler o trajeto deste GPX.';
const COR_LOCALIZACAO = '#2563eb';

type EstadoLocalizacao = 'desligada' | 'buscando' | 'ligada';

// Mostra o trajeto de um GPX no mapa (Leaflet + tiles do OpenStreetMap). Carregamento sob demanda: nada é baixado nem o mapa é criado
// até o clique em "Ver trajeto no mapa" (ou até `gpx` ser informado). Fonte do arquivo: `gpx` (Blob ou texto) OU `carregar` (função que
// devolve o Blob, para o download autenticado). O conteúdo do GPX nunca vira HTML; só coordenadas numéricas vão para o mapa.
// Tela cheia: API de tela cheia do navegador quando existe (Android/desktop) e, sempre, o contêiner fixo cobrindo a tela (iPhone não tem a API).
// Minha localização (`[localizacao]="true"`): só liga no clique; a posição fica só no aparelho (nunca vai para a API nem para storage).
@Component({
    standalone: true,
    selector: 'app-mapa-gpx',
    templateUrl: './mapa-gpx.component.html',
    styleUrls: ['./mapa-gpx.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
})
export class MapaGpxComponent implements OnInit, OnDestroy {
    @Input() gpx?: Blob | string | null;
    /** true: carrega e desenha o trajeto ao abrir a tela, sem o botão "Ver trajeto no mapa". */
    @Input() automatico = false;
    @Input() carregar?: () => Observable<Blob>;
    /** true: mostra o botão "Minha localização" (só liga quando a pessoa clica). */
    @Input() localizacao = false;
    /** Emite a largada do trajeto quando o GPX é lido, ou null se não deu para ler (usado pelo cartão "Luz e tempo"). */
    @Output() largadaLida = new EventEmitter<PontoGpx | null>();
    @ViewChild('mapa', { static: true }) mapaEl!: ElementRef<HTMLDivElement>;
    @ViewChild('quadro', { static: true }) quadroEl!: ElementRef<HTMLDivElement>;

    estado: 'inicial' | 'carregando' | 'pronto' | 'erro' = 'inicial';
    mensagemErro = MENSAGEM_INVALIDO;
    distanciaTexto = '';
    temKm = false;

    telaCheia = false;
    estadoLocalizacao: EstadoLocalizacao = 'desligada';
    textoLocalizacao = '';
    erroLocalizacao = '';
    readonly geolocalizacaoDisponivel = typeof window !== 'undefined' && window.isSecureContext && 'geolocation' in navigator;

    private _mapa?: L.Map;
    private _sub?: Subscription;
    private _trajeto?: TrajetoGpx;
    private _limitesTrajeto?: L.LatLngBounds;
    private _watchId?: number;
    private _marcadorPosicao?: L.CircleMarker;
    private _circuloPrecisao?: L.Circle;
    private _overflowAnterior = '';

    constructor(private _cdr: ChangeDetectorRef) { }

    ngOnInit(): void {
        if (this.automatico) {
            this.abrir();
        }
    }

    abrir(): void {
        this._sub?.unsubscribe();
        this.estado = 'carregando';
        if (this.gpx != null) {
            this.processar(this.gpx);
            return;
        }
        if (!this.carregar) {
            this.falhar(MENSAGEM_INVALIDO);
            return;
        }
        this._sub = this.carregar().subscribe({
            next: blob => this.processar(blob),
            error: () => this.falhar('Não foi possível carregar o GPX para o mapa.'),
        });
    }

    ngOnDestroy(): void {
        this._sub?.unsubscribe();
        this.desligarLocalizacao();
        if (this.telaCheia) {
            this.sairTelaCheia();
        }
        this.destruirMapa();
    }

    // ---------- Tela cheia ----------

    alternarTelaCheia(): void {
        this.telaCheia ? this.sairTelaCheia() : this.entrarTelaCheia();
    }

    private entrarTelaCheia(): void {
        this.telaCheia = true;
        this._overflowAnterior = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const el = this.quadroEl.nativeElement;
        if (el.requestFullscreen && !document.fullscreenElement) {
            el.requestFullscreen().catch(() => { /* sem permissão: fica só o contêiner fixo */ });
        }
        this._mapa?.scrollWheelZoom.enable();
        this.reajustarMapa();
    }

    private sairTelaCheia(): void {
        this.telaCheia = false;
        document.body.style.overflow = this._overflowAnterior;
        if (document.fullscreenElement === this.quadroEl.nativeElement) {
            document.exitFullscreen?.().catch(() => { });
        }
        this._mapa?.scrollWheelZoom.disable();
        this.reajustarMapa();
    }

    // Saída pela tecla Esc ou pelo gesto de voltar do navegador na tela cheia nativa.
    @HostListener('document:fullscreenchange')
    aoMudarTelaCheia(): void {
        if (this.telaCheia && document.fullscreenElement !== this.quadroEl.nativeElement) {
            this.sairTelaCheia();
            this._cdr.detectChanges();
        }
    }

    @HostListener('document:keydown.escape')
    aoEsc(): void {
        if (this.telaCheia) {
            this.sairTelaCheia();
        }
    }

    private reajustarMapa(): void {
        this._cdr.detectChanges();
        // Espera o navegador aplicar o novo tamanho antes do Leaflet medir.
        setTimeout(() => this._mapa?.invalidateSize(), 50);
        setTimeout(() => this._mapa?.invalidateSize(), 300);
    }

    // ---------- Minha localização ----------

    alternarLocalizacao(): void {
        if (this.estadoLocalizacao === 'desligada') {
            this.ligarLocalizacao();
        } else {
            this.desligarLocalizacao();
        }
    }

    private ligarLocalizacao(): void {
        if (!this.geolocalizacaoDisponivel) {
            return;
        }
        this.estadoLocalizacao = 'buscando';
        this.erroLocalizacao = '';
        this.textoLocalizacao = '';
        let primeira = true;
        this._watchId = navigator.geolocation.watchPosition(
            pos => {
                this.atualizarPosicao([pos.coords.latitude, pos.coords.longitude], pos.coords.accuracy, primeira);
                primeira = false;
            },
            erro => this.falharLocalizacao(erro),
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 },
        );
    }

    desligarLocalizacao(): void {
        if (this._watchId != null) {
            navigator.geolocation.clearWatch(this._watchId);
            this._watchId = undefined;
        }
        this._marcadorPosicao?.remove();
        this._circuloPrecisao?.remove();
        this._marcadorPosicao = undefined;
        this._circuloPrecisao = undefined;
        this.estadoLocalizacao = 'desligada';
        this.textoLocalizacao = '';
        this.erroLocalizacao = '';
    }

    private atualizarPosicao(p: PontoGpx, precisaoM: number, primeira: boolean): void {
        if (!this._mapa || !this._trajeto) {
            return;
        }
        const latLng = L.latLng(p[0], p[1]);
        const raio = Number.isFinite(precisaoM) ? precisaoM : 0;
        if (!this._marcadorPosicao) {
            this._circuloPrecisao = L.circle(latLng, { radius: raio, color: COR_LOCALIZACAO, weight: 1, fillColor: COR_LOCALIZACAO, fillOpacity: 0.12, interactive: false }).addTo(this._mapa);
            this._marcadorPosicao = L.circleMarker(latLng, { radius: 8, color: '#ffffff', weight: 3, fillColor: COR_LOCALIZACAO, fillOpacity: 1 })
                .bindTooltip('Você está aqui').addTo(this._mapa);
        } else {
            this._marcadorPosicao.setLatLng(latLng);
            this._circuloPrecisao?.setLatLng(latLng).setRadius(raio);
        }
        if (primeira && this._limitesTrajeto) {
            this._mapa.fitBounds(L.latLngBounds(this._limitesTrajeto.getSouthWest(), this._limitesTrajeto.getNorthEast()).extend(latLng), { padding: [30, 30], maxZoom: 17 });
        }

        const distM = distanciaAoTrajetoKm(p, this._trajeto.Segmentos) * 1000;
        this.textoLocalizacao = distM <= Math.max(30, Math.min(raio, 100)) ? 'Você está no percurso' : `Você está a ${this.formatarDistancia(distM)} do percurso`;
        this.erroLocalizacao = '';
        this.estadoLocalizacao = 'ligada';
        this._cdr.markForCheck();
    }

    private falharLocalizacao(erro: GeolocationPositionError): void {
        if (erro.code === erro.PERMISSION_DENIED) {
            this.desligarLocalizacao();
            this.erroLocalizacao = 'Localização bloqueada. Libere o acesso à localização para este site nas configurações do navegador.';
        } else if (this.estadoLocalizacao === 'buscando') {
            // Sem sinal ainda: continua tentando (o watch segue ativo).
            this.erroLocalizacao = 'Não foi possível obter sua localização agora. Tentando de novo...';
        }
        this._cdr.markForCheck();
    }

    private formatarDistancia(m: number): string {
        if (m < 1000) {
            return `${Math.round(m / 10) * 10} m`;
        }
        return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
    }

    // ---------- Trajeto ----------

    private async processar(origem: Blob | string): Promise<void> {
        let trajeto: TrajetoGpx | null = null;
        try {
            const texto = typeof origem === 'string' ? origem : await origem.text();
            trajeto = lerGpx(texto);
        } catch {
            trajeto = null;
        }
        if (!trajeto) {
            this.falhar(MENSAGEM_INVALIDO);
            return;
        }
        this.distanciaTexto = `${trajeto.DistanciaKm.toFixed(2).replace('.', ',')} km`;
        this.estado = 'pronto';
        this.largadaLida.emit(trajeto.Largada);
        this._cdr.detectChanges(); // torna o contêiner visível antes do Leaflet medir o tamanho
        this.desenhar(trajeto);
    }

    private falhar(mensagem: string): void {
        this.mensagemErro = mensagem;
        this.estado = 'erro';
        this.largadaLida.emit(null);
        this._cdr.markForCheck();
    }

    private desenhar(t: TrajetoGpx): void {
        this.desligarLocalizacao();
        this.destruirMapa();
        const mapa = L.map(this.mapaEl.nativeElement, { scrollWheelZoom: this.telaCheia });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            // Envia só a origem (nunca o caminho /e/<token>) e atende a política de uso dos tiles do OSM.
            referrerPolicy: 'origin',
        } as L.TileLayerOptions).addTo(mapa);

        const linhas = t.Segmentos.map(s => L.polyline(s, { color: '#F97316', weight: 4, opacity: 0.9 }).addTo(mapa));
        L.circleMarker(t.Largada, { radius: 8, color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).bindTooltip('Largada').addTo(mapa);
        L.circleMarker(t.Chegada, { radius: 8, color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }).bindTooltip('Chegada').addTo(mapa);
        // Marcas de km (só número no divIcon, montado aqui: nada do GPX vira HTML).
        const marcas = marcasDeKm(t);
        this.temKm = marcas.length > 0;
        const marcadores = marcas.map(m => L.marker(m.Ponto, {
            icon: L.divIcon({ className: 'mapa-gpx-km', html: `<span>${m.Km}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }),
            interactive: false,
            keyboard: false,
        }).addTo(mapa));
        // Com o mapa afastado as marcas se amontoam: mostra só uma a cada N, para ficarem a pelo menos 30 px uma da outra.
        const espacarKm = () => {
            if (marcadores.length < 2) {
                return;
            }
            const px = mapa.latLngToContainerPoint(marcas[0].Ponto).distanceTo(mapa.latLngToContainerPoint(marcas[1].Ponto));
            const cada = px >= 30 ? 1 : [2, 5, 10, 20, 50].find(n => px * n >= 30) ?? 100;
            marcadores.forEach((mk, i) => mk.setOpacity((i + 1) % cada === 0 ? 1 : 0));
        };
        mapa.on('zoomend', espacarKm);
        this._limitesTrajeto = L.featureGroup(linhas).getBounds();
        mapa.fitBounds(this._limitesTrajeto, { padding: [20, 20] });
        espacarKm();
        this._mapa = mapa;
        this._trajeto = t;
    }

    private destruirMapa(): void {
        this._mapa?.remove();
        this._mapa = undefined;
        this._trajeto = undefined;
        this._limitesTrajeto = undefined;
    }
}
