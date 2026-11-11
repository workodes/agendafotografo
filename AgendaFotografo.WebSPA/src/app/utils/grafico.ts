// Apoio aos gráficos do Início (ApexCharts via ng-apexcharts). Cores vêm das variáveis --fuse-* do tema, com reserva em hex.
export const COR_TEXTO_GRAFICO = '#44403C';
export const COR_SECUNDARIA_GRAFICO = '#78716C';
export const COR_APOIO_GRAFICO = '#D6D3D1'; // stone-300 (mês anterior e "Outros")

/** Lê uma variável CSS do tema (ex.: `--fuse-primary-500`); sem ela, devolve a cor reserva. */
export function corDoTema(variavel: string, reserva: string): string {
    if (typeof document === 'undefined') {
        return reserva;
    }
    const valor = getComputedStyle(document.documentElement).getPropertyValue(variavel).trim();
    return valor || reserva;
}

/** Cor da marca para preenchimento (primary-500; só sem texto, regra do plano 16). */
export function corPrincipalGrafico(): string {
    return corDoTema('--fuse-primary-500', '#F97316');
}

export function reduzirMovimento(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** "N evento(s)" no tooltip. */
export function textoEventos(valor: number): string {
    return `${valor} ${valor === 1 ? 'evento' : 'eventos'}`;
}

/** Opções comuns: sem barra de ferramentas nem zoom, animação curta (desligada com reduced-motion), fonte herdada. */
export function chartBase(altura: number): any {
    return {
        type: 'bar',
        height: altura,
        width: '100%',
        fontFamily: 'inherit',
        background: 'transparent',
        toolbar: { show: false },
        zoom: { enabled: false },
        selection: { enabled: false },
        animations: reduzirMovimento()
            ? { enabled: false }
            : { enabled: true, speed: 300, animateGradually: { enabled: false }, dynamicAnimation: { enabled: true, speed: 300 } },
    };
}
