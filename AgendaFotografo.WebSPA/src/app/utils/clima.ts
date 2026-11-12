// Previsão do tempo pelo Open-Meteo (gratuito, sem chave). Usa fetch direto, e NÃO o HttpClient: o authInterceptor anexaria o Bearer do
// coordenador logado a um domínio de terceiros. Sai sem cookies e sem referrer; só vão coordenadas (ou o nome da cidade) e a data.

export type Coordenadas = [number, number]; // [latitude, longitude]

export interface PrevisaoClima {
    Data: string;
    Codigo: number;
    TempMin: number;
    TempMax: number;
    ChuvaProb: number | null;
    VentoMax: number | null;
    /** Na hora do evento (quando a hora é conhecida). */
    Hora?: { Hora: string; Codigo: number; Temp: number; ChuvaProb: number | null; Vento: number | null } | null;
}

/** A previsão do Open-Meteo vai até 16 dias à frente (hoje + 15). */
export const DIAS_PREVISAO = 15;

const OPCOES_FETCH: RequestInit = { credentials: 'omit', referrerPolicy: 'no-referrer', mode: 'cors' };

function valido(lat: number, lon: number): boolean {
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
}

/** Coordenadas de um link do Google Maps ("@lat,lon", "?q=lat,lon", "query=", "ll=", "destination="). */
export function coordenadasDoLink(link: string | null | undefined): Coordenadas | null {
    if (!link) {
        return null;
    }
    const padroes = [/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/];
    for (const p of padroes) {
        const m = link.match(p);
        if (m && valido(Number(m[1]), Number(m[2]))) {
            return [Number(m[1]), Number(m[2])];
        }
    }
    return null;
}

/** Busca a cidade (Brasil) no geocodificador do Open-Meteo. "Joinville - SC" e "Joinville/SC" viram "Joinville". */
export async function coordenadasDaCidade(cidade: string, sinal?: AbortSignal): Promise<Coordenadas | null> {
    const nome = (cidade ?? '').split(/\s*[-\/,(]\s*/)[0].trim();
    if (nome.length < 2) {
        return null;
    }
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=1&language=pt&format=json&countryCode=BR`;
    const resp = await fetch(url, { ...OPCOES_FETCH, signal: sinal });
    if (!resp.ok) {
        return null;
    }
    const json = await resp.json();
    const r = json?.results?.[0];
    return r && valido(Number(r.latitude), Number(r.longitude)) ? [Number(r.latitude), Number(r.longitude)] : null;
}

/** dataIso "yyyy-MM-dd"; hora "HH:mm:ss" ou null. Devolve null se o serviço não tiver o dia. */
export async function buscarPrevisao(c: Coordenadas, dataIso: string, hora: string | null | undefined, sinal?: AbortSignal): Promise<PrevisaoClima | null> {
    const p = new URLSearchParams({
        latitude: c[0].toFixed(4),
        longitude: c[1].toFixed(4),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max',
        hourly: 'weather_code,temperature_2m,precipitation_probability,wind_speed_10m',
        timezone: 'auto',
        start_date: dataIso,
        end_date: dataIso,
    });
    const resp = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`, { ...OPCOES_FETCH, signal: sinal });
    if (!resp.ok) {
        return null;
    }
    const j = await resp.json();
    const d = j?.daily;
    if (!d?.time?.length || d.weather_code?.[0] == null) {
        return null;
    }
    const r: PrevisaoClima = {
        Data: d.time[0],
        Codigo: Number(d.weather_code[0]),
        TempMin: Number(d.temperature_2m_min[0]),
        TempMax: Number(d.temperature_2m_max[0]),
        ChuvaProb: d.precipitation_probability_max?.[0] ?? null,
        VentoMax: d.wind_speed_10m_max?.[0] ?? null,
        Hora: null,
    };
    const hh = (hora ?? '').slice(0, 2);
    const h = j?.hourly;
    if (/^\d{2}$/.test(hh) && h?.time?.length) {
        const i = h.time.indexOf(`${dataIso}T${hh}:00`);
        if (i >= 0 && h.weather_code?.[i] != null) {
            r.Hora = {
                Hora: `${hh}:00`,
                Codigo: Number(h.weather_code[i]),
                Temp: Number(h.temperature_2m[i]),
                ChuvaProb: h.precipitation_probability?.[i] ?? null,
                Vento: h.wind_speed_10m?.[i] ?? null,
            };
        }
    }
    return r;
}

/** Código WMO do Open-Meteo -> texto em pt-BR. */
export function textoClima(codigo: number): string {
    if (codigo === 0) { return 'Céu limpo'; }
    if (codigo === 1) { return 'Predomínio de sol'; }
    if (codigo === 2) { return 'Parcialmente nublado'; }
    if (codigo === 3) { return 'Nublado'; }
    if (codigo === 45 || codigo === 48) { return 'Neblina'; }
    if (codigo >= 51 && codigo <= 57) { return 'Garoa'; }
    if (codigo === 61) { return 'Chuva fraca'; }
    if (codigo === 63) { return 'Chuva'; }
    if (codigo === 65 || codigo === 66 || codigo === 67) { return 'Chuva forte'; }
    if (codigo >= 71 && codigo <= 77) { return 'Neve'; }
    if (codigo === 80) { return 'Pancadas de chuva fracas'; }
    if (codigo === 81) { return 'Pancadas de chuva'; }
    if (codigo === 82) { return 'Pancadas de chuva fortes'; }
    if (codigo === 85 || codigo === 86) { return 'Neve'; }
    if (codigo >= 95) { return 'Trovoadas'; }
    return 'Tempo variável';
}

/** Ícone registrado no SPA para o código do tempo. */
export function iconeClima(codigo: number): string {
    if (codigo <= 1) { return 'mat_outline:wb_sunny'; }
    if (codigo <= 3 || codigo === 45 || codigo === 48) { return 'mat_outline:cloud'; }
    if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) { return 'mat_outline:ac_unit'; }
    return 'mat_outline:umbrella';
}

/** Chuva ou trovoada: o fotógrafo deve levar proteção para o equipamento. */
export function climaComChuva(codigo: number, prob: number | null | undefined): boolean {
    return codigo >= 51 || (prob ?? 0) >= 40;
}
