// Posição do sol (fórmulas do SunCalc, Vladimir Agafonkin, BSD; precisão de ~1 minuto, suficiente para planejar luz de fotografia).
// Tudo no fuso do aparelho: a data/hora do evento é tratada como hora local (o público e os eventos são do Brasil).

const RAD = Math.PI / 180;
const DIA_MS = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUIDADE = RAD * 23.4397;

export interface PosicaoSol {
    /** Altura acima do horizonte, em graus (negativa = abaixo). */
    Altura: number;
    /** Direção de onde o sol está, em graus a partir do norte, no sentido horário (0 = N, 90 = L). */
    Direcao: number;
}

export interface DiaSol {
    Nascer: Date | null;
    Por: Date | null;
    /** Fim da hora dourada da manhã (sol a 6°) e início da hora dourada da tarde. */
    FimDouradaManha: Date | null;
    InicioDouradaTarde: Date | null;
}

function diasDesde2000(d: Date): number {
    return d.valueOf() / DIA_MS - 0.5 + J1970 - J2000;
}

export function posicaoSol(data: Date, lat: number, lon: number): PosicaoSol {
    const d = diasDesde2000(data);
    const m = RAD * (357.5291 + 0.98560028 * d);
    const l = m + RAD * (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m)) + RAD * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(OBLIQUIDADE) * Math.sin(l));
    const ra = Math.atan2(Math.sin(l) * Math.cos(OBLIQUIDADE), Math.cos(l));
    const phi = RAD * lat;
    const h = RAD * (280.16 + 360.9856235 * d) + RAD * lon - ra;
    const altura = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(h));
    const azSul = Math.atan2(Math.sin(h), Math.cos(h) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
    return { Altura: altura / RAD, Direcao: ((azSul / RAD) + 180 + 360) % 360 };
}

// Varre o dia de minuto em minuto procurando as passagens da altura (-0,833° = nascer/pôr com refração; 6° = hora dourada).
export function diaSol(ano: number, mes: number, dia: number, lat: number, lon: number): DiaSol {
    const r: DiaSol = { Nascer: null, Por: null, FimDouradaManha: null, InicioDouradaTarde: null };
    let anterior = posicaoSol(new Date(ano, mes - 1, dia, 0, 0), lat, lon).Altura;
    for (let min = 1; min <= 1440; min++) {
        const t = new Date(ano, mes - 1, dia, 0, min);
        const alt = posicaoSol(t, lat, lon).Altura;
        if (anterior < -0.833 && alt >= -0.833 && !r.Nascer) { r.Nascer = t; }
        if (anterior < 6 && alt >= 6 && !r.FimDouradaManha) { r.FimDouradaManha = t; }
        if (anterior >= 6 && alt < 6) { r.InicioDouradaTarde = t; }
        if (anterior >= -0.833 && alt < -0.833) { r.Por = t; }
        anterior = alt;
    }
    return r;
}

const PONTOS = ['N', 'NNE', 'NE', 'ENE', 'L', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
const NOMES = ['norte', 'nordeste', 'leste', 'sudeste', 'sul', 'sudoeste', 'oeste', 'noroeste'];

export function siglaDirecao(graus: number): string {
    return PONTOS[Math.round(((graus % 360) + 360) % 360 / 22.5) % 16];
}

export function nomeDirecao(graus: number): string {
    return NOMES[Math.round(((graus % 360) + 360) % 360 / 45) % 8];
}

/** Texto curto sobre a luz para quem fotografa, a partir da altura do sol. */
export function descricaoLuz(p: PosicaoSol): string {
    const lado = nomeDirecao(p.Direcao);
    if (p.Altura < -6) {
        return 'Ainda está escuro: sem luz do sol.';
    }
    if (p.Altura < 0) {
        return 'Crepúsculo: claridade sem sol direto, luz suave e azulada.';
    }
    if (p.Altura < 6) {
        return `Sol nascendo/se pondo no ${lado}: luz dourada e muito baixa. Fotografando virado para o ${lado}, contraluz forte.`;
    }
    if (p.Altura < 20) {
        return `Sol baixo no ${lado}: sombras longas. Fotografando virado para o ${lado}, o atleta fica em contraluz.`;
    }
    if (p.Altura < 50) {
        return `Sol a meia altura no ${lado}: boa luz lateral. Evite fotografar virado para o ${lado}.`;
    }
    return 'Sol alto: luz dura e sombras curtas no rosto. Bonés e viseiras escurecem os olhos.';
}
