import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Coordenadas, DIAS_PREVISAO, PrevisaoClima, buscarPrevisao, climaComChuva, coordenadasDaCidade, iconeClima, textoClima } from 'app/utils/clima';
import { hojeIso, parseDataIso, somarDiasIso } from 'app/utils/data-evento';
import { DiaSol, PosicaoSol, descricaoLuz, diaSol, nomeDirecao, posicaoSol } from 'app/utils/sol';

// Cartão "Luz e tempo" do link público: nascer/pôr do sol, hora dourada, posição do sol na hora do evento (calculados no aparelho) e
// previsão do tempo (Open-Meteo, a partir de 15 dias antes). O ponto vem da largada do GPX, das coordenadas de um link ou, por último, da cidade.
// Só mostra coisas de dias de hoje em diante; evento passado ou cancelado não renderiza nada (o pai decide).
@Component({
    standalone: true,
    selector: 'app-evento-condicoes',
    templateUrl: './evento-condicoes.component.html',
    imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
})
export class EventoCondicoesComponent implements OnChanges, OnDestroy {
    @Input() data!: string;               // yyyy-MM-dd
    @Input() hora?: string | null;        // HH:mm:ss ou null
    @Input() cidade?: string | null;
    /** Coordenadas exatas (largada do GPX ou link). Null = usar a cidade. */
    @Input() ponto: Coordenadas | null = null;
    /** true enquanto o GPX ainda não foi lido (evita buscar pela cidade e trocar logo depois). */
    @Input() aguardando = false;

    estado: 'carregando' | 'pronto' | 'semLocal' = 'carregando';
    origem: 'ponto' | 'cidade' = 'ponto';
    sol: DiaSol | null = null;
    posicao: PosicaoSol | null = null;
    textoLuz = '';

    estadoClima: 'carregando' | 'pronto' | 'longe' | 'indisponivel' = 'carregando';
    clima: PrevisaoClima | null = null;
    diasParaPrevisao = 0;

    private _controle?: AbortController;
    private _chave = '';

    constructor(private _cdr: ChangeDetectorRef) { }

    ngOnChanges(): void {
        if (this.aguardando) {
            return;
        }
        const chave = `${this.data}|${this.hora}|${this.cidade}|${this.ponto?.join(',')}`;
        if (chave === this._chave) {
            return;
        }
        this._chave = chave;
        this.carregar();
    }

    ngOnDestroy(): void {
        this._controle?.abort();
    }

    get nomeSol(): string {
        return this.posicao ? nomeDirecao(this.posicao.Direcao) : '';
    }

    get alturaSol(): number {
        return this.posicao ? Math.round(this.posicao.Altura) : 0;
    }

    texto(codigo: number): string {
        return textoClima(codigo);
    }

    icone(codigo: number): string {
        return iconeClima(codigo);
    }

    get chuva(): boolean {
        const c = this.clima;
        return !!c && climaComChuva(c.Hora?.Codigo ?? c.Codigo, c.Hora?.ChuvaProb ?? c.ChuvaProb);
    }

    hhmm(d: Date | null): string {
        return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '--:--';
    }

    arred(n: number | null | undefined): string {
        return n == null || !Number.isFinite(n) ? '-' : String(Math.round(n));
    }

    private async carregar(): Promise<void> {
        this._controle?.abort();
        const controle = new AbortController();
        this._controle = controle;
        this.estado = 'carregando';
        this.estadoClima = 'carregando';
        this.clima = null;

        let c: Coordenadas | null = this.ponto;
        this.origem = 'ponto';
        if (!c && this.cidade) {
            this.origem = 'cidade';
            try {
                c = await coordenadasDaCidade(this.cidade, controle.signal);
            } catch {
                c = null;
            }
        }
        if (controle.signal.aborted) {
            return;
        }
        const dia = parseDataIso(this.data);
        if (!c || !dia) {
            this.estado = 'semLocal';
            this._cdr.markForCheck();
            return;
        }

        this.sol = diaSol(dia.getFullYear(), dia.getMonth() + 1, dia.getDate(), c[0], c[1]);
        const hm = /^\d{2}:\d{2}/.test(this.hora ?? '') ? this.hora!.split(':').map(Number) : null;
        this.posicao = hm ? posicaoSol(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hm[0], hm[1]), c[0], c[1]) : null;
        this.textoLuz = this.posicao ? descricaoLuz(this.posicao) : '';
        this.estado = 'pronto';
        this._cdr.markForCheck();

        // Previsão: só de hoje até hoje + 15.
        const hoje = hojeIso();
        if (this.data > somarDiasIso(hoje, DIAS_PREVISAO)) {
            const ms = (parseDataIso(this.data)!.getTime() - parseDataIso(hoje)!.getTime()) / 864e5;
            this.diasParaPrevisao = Math.round(ms) - DIAS_PREVISAO;
            this.estadoClima = 'longe';
            this._cdr.markForCheck();
            return;
        }
        try {
            this.clima = await buscarPrevisao(c, this.data, this.hora, controle.signal);
            if (controle.signal.aborted) {
                return;
            }
            this.estadoClima = this.clima ? 'pronto' : 'indisponivel';
        } catch {
            if (controle.signal.aborted) {
                return;
            }
            this.estadoClima = 'indisponivel';
        }
        this._cdr.markForCheck();
    }
}
