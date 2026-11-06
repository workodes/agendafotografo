// Leitura de GPX só no front. Usa DOMParser e getElementsByTagName (ignora namespace); nada do arquivo vira HTML.
export type PontoGpx = [number, number]; // [latitude, longitude]

export interface TrajetoGpx {
    Segmentos: PontoGpx[][];
    DistanciaKm: number;
    Largada: PontoGpx;
    Chegada: PontoGpx;
}

function coordenada(el: Element): PontoGpx | null {
    const lat = Number(el.getAttribute('lat'));
    const lon = Number(el.getAttribute('lon'));
    if (!el.hasAttribute('lat') || !el.hasAttribute('lon') || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
    }
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 ? [lat, lon] : null;
}

function validos(els: Element[]): PontoGpx[] {
    return els.map(coordenada).filter((p): p is PontoGpx => p !== null);
}

export function distanciaHaversineKm(a: PontoGpx, b: PontoGpx): number {
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad;
    const dLon = (b[1] - a[1]) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Devolve null quando o texto não é um GPX com ao menos 2 coordenadas válidas.
export function lerGpx(texto: string): TrajetoGpx | null {
    const doc = new DOMParser().parseFromString(texto, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
        return null;
    }

    // 1) trilhas (um segmento por trkseg); 2) rotas (rtept); 3) waypoints soltos (wpt).
    let segmentos: PontoGpx[][] = Array.from(doc.getElementsByTagName('trkseg')).map(s => validos(Array.from(s.getElementsByTagName('trkpt'))));
    if (!segmentos.some(s => s.length >= 2)) {
        segmentos = Array.from(doc.getElementsByTagName('rte')).map(r => validos(Array.from(r.getElementsByTagName('rtept'))));
    }
    if (!segmentos.some(s => s.length >= 2)) {
        segmentos = [validos(Array.from(doc.getElementsByTagName('trkpt')))];
    }
    if (!segmentos.some(s => s.length >= 2)) {
        segmentos = [validos(Array.from(doc.getElementsByTagName('rtept')))];
    }
    if (!segmentos.some(s => s.length >= 2)) {
        segmentos = [validos(Array.from(doc.getElementsByTagName('wpt')))];
    }
    segmentos = segmentos.filter(s => s.length >= 2);
    if (segmentos.length === 0) {
        return null;
    }

    let distancia = 0;
    for (const s of segmentos) {
        for (let i = 1; i < s.length; i++) {
            distancia += distanciaHaversineKm(s[i - 1], s[i]);
        }
    }
    const ultimo = segmentos[segmentos.length - 1];
    return { Segmentos: segmentos, DistanciaKm: distancia, Largada: segmentos[0][0], Chegada: ultimo[ultimo.length - 1] };
}
