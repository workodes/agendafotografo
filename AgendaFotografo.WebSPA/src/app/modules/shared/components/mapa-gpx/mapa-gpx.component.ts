import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import * as L from 'leaflet';
import { Observable, Subscription } from 'rxjs';
import { TrajetoGpx, lerGpx } from './mapa-gpx.util';

const MENSAGEM_INVALIDO = 'Não foi possível ler o trajeto deste GPX.';

// Mostra o trajeto de um GPX no mapa (Leaflet + tiles do OpenStreetMap). Carregamento sob demanda: nada é baixado nem o mapa é criado
// até o clique em "Ver trajeto no mapa" (ou até `gpx` ser informado). Fonte do arquivo: `gpx` (Blob ou texto) OU `carregar` (função que
// devolve o Blob, para o download autenticado). O conteúdo do GPX nunca vira HTML; só coordenadas numéricas vão para o mapa.
@Component({
    standalone: true,
    selector: 'app-mapa-gpx',
    templateUrl: './mapa-gpx.component.html',
    styleUrls: ['./mapa-gpx.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
})
export class MapaGpxComponent implements OnDestroy {
    @Input() gpx?: Blob | string | null;
    @Input() carregar?: () => Observable<Blob>;
    @ViewChild('mapa', { static: true }) mapaEl!: ElementRef<HTMLDivElement>;

    estado: 'inicial' | 'carregando' | 'pronto' | 'erro' = 'inicial';
    mensagemErro = MENSAGEM_INVALIDO;
    distanciaTexto = '';

    private _mapa?: L.Map;
    private _sub?: Subscription;

    constructor(private _cdr: ChangeDetectorRef) { }

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
        this.destruirMapa();
    }

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
        this._cdr.detectChanges(); // torna o contêiner visível antes do Leaflet medir o tamanho
        this.desenhar(trajeto);
    }

    private falhar(mensagem: string): void {
        this.mensagemErro = mensagem;
        this.estado = 'erro';
        this._cdr.markForCheck();
    }

    private desenhar(t: TrajetoGpx): void {
        this.destruirMapa();
        const mapa = L.map(this.mapaEl.nativeElement, { scrollWheelZoom: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            // Envia só a origem (nunca o caminho /e/<token>) e atende a política de uso dos tiles do OSM.
            referrerPolicy: 'origin',
        } as L.TileLayerOptions).addTo(mapa);

        const linhas = t.Segmentos.map(s => L.polyline(s, { color: '#F97316', weight: 4, opacity: 0.9 }).addTo(mapa));
        L.circleMarker(t.Largada, { radius: 8, color: '#ffffff', weight: 2, fillColor: '#16a34a', fillOpacity: 1 }).bindTooltip('Largada').addTo(mapa);
        L.circleMarker(t.Chegada, { radius: 8, color: '#ffffff', weight: 2, fillColor: '#dc2626', fillOpacity: 1 }).bindTooltip('Chegada').addTo(mapa);
        mapa.fitBounds(L.featureGroup(linhas).getBounds(), { padding: [20, 20] });
        this._mapa = mapa;
    }

    private destruirMapa(): void {
        this._mapa?.remove();
        this._mapa = undefined;
    }
}
