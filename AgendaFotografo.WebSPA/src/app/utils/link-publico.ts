import { formatarData } from './data-evento';

// Apoio do link público: URL, texto de compartilhamento, aparelho e acesso guardado no navegador.
// O código de 4 dígitos nunca é guardado aqui (só o acesso de 7 dias).

const CHAVE_APARELHO = 'agf_aparelho';
const PREFIXO_ACESSO = 'agf_link_';

export interface AcessoGuardado {
    Acesso: string;
    ExpiraEm: string;
}

/** URL pública do evento: base do documento + "e/<token>". */
export function urlPublica(token: string): string {
    return `${document.baseURI}e/${token}`;
}

/** Texto em 3 linhas para colar no WhatsApp. */
export function textoWhatsApp(nome: string, dataIso: string, token: string, codigo: string): string {
    return `${nome} - ${formatarData(dataIso)}\nLink: ${urlPublica(token)}\nCódigo: ${codigo}`;
}

export function urlWhatsApp(texto: string): string {
    return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

function uuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/** Identificador deste aparelho (UUID, 8 a 64 caracteres [A-Za-z0-9-]), criado na primeira vez. */
export function obterAparelho(): string {
    try {
        const atual = localStorage.getItem(CHAVE_APARELHO);
        if (atual && /^[A-Za-z0-9-]{8,64}$/.test(atual)) {
            return atual;
        }
        const novo = uuid();
        localStorage.setItem(CHAVE_APARELHO, novo);
        return novo;
    } catch {
        return uuid();
    }
}

/** Acesso guardado para o token; apaga e devolve null se vencido ou inválido. */
export function lerAcesso(token: string): AcessoGuardado | null {
    try {
        const bruto = localStorage.getItem(PREFIXO_ACESSO + token);
        if (!bruto) {
            return null;
        }
        const a = JSON.parse(bruto) as AcessoGuardado;
        const expira = Date.parse(a?.ExpiraEm);
        if (!a?.Acesso || isNaN(expira) || expira <= Date.now()) {
            apagarAcesso(token);
            return null;
        }
        return a;
    } catch {
        apagarAcesso(token);
        return null;
    }
}

export function guardarAcesso(token: string, acesso: AcessoGuardado): void {
    try {
        localStorage.setItem(PREFIXO_ACESSO + token, JSON.stringify({ Acesso: acesso.Acesso, ExpiraEm: acesso.ExpiraEm }));
    } catch {
        // Sem storage (modo privado): o acesso vale só nesta abertura.
    }
}

export function apagarAcesso(token: string): void {
    try {
        localStorage.removeItem(PREFIXO_ACESSO + token);
    } catch {
        // ignora
    }
}

/** Só http/https; qualquer outra coisa (javascript:, data:) vira null. */
export function urlSegura(url: string | null | undefined): string | null {
    const v = (url ?? '').trim();
    return /^https?:\/\/\S+$/i.test(v) ? v : null;
}

/** Link do Maps: o cadastrado (se http/https) ou uma busca pelo local/cidade; sem nada, null. */
export function linkMaps(local: string | null | undefined, link: string | null | undefined, cidade: string | null | undefined): string | null {
    const seguro = urlSegura(link);
    if (seguro) {
        return seguro;
    }
    const consulta = [local?.trim(), cidade?.trim()].filter(x => !!x).join(', ');
    return local?.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}` : null;
}

const EMBED_MAPS = 'https://www.google.com/maps';

/** Endereço do iframe do Google Maps (sem chave de API) para um ponto: usa o link cadastrado quando dá para entender
 *  (My Maps, busca, coordenadas @lat,lon, lugar, rota "dir") e, senão, busca pelo local + cidade. Sem nada, null.
 *  O resultado sempre começa com https://www.google.com/maps e só leva parâmetros codificados. */
export function embedMaps(local: string | null | undefined, link: string | null | undefined, cidade: string | null | undefined): string | null {
    const doLink = embedDoLink(link);
    if (doLink) {
        return doLink;
    }
    const consulta = [local?.trim(), cidade?.trim()].filter(x => !!x).join(', ');
    return local?.trim() ? embedBusca(consulta) : null;
}

/** Só o link (rota no Maps/My Maps); null quando o link não é do Google Maps ou não dá para incorporar (ex.: maps.app.goo.gl). */
export function embedDoLink(link: string | null | undefined): string | null {
    const seguro = urlSegura(link);
    if (!seguro) {
        return null;
    }
    let u: URL;
    try { u = new URL(seguro); } catch { return null; }
    const hostMaps = /^maps\.google\.[a-z.]+$/i.test(u.hostname);
    if (!/(^|\.)google\.[a-z.]+$/i.test(u.hostname) || (!hostMaps && !u.pathname.startsWith('/maps'))) {
        return null;
    }

    // My Maps (/maps/d/viewer|edit|embed?mid=...)
    const mid = u.searchParams.get('mid');
    if (u.pathname.startsWith('/maps/d/') && mid && /^[\w-]+$/.test(mid)) {
        return `${EMBED_MAPS}/d/embed?mid=${encodeURIComponent(mid)}`;
    }

    // Rota: /maps/dir/A/B[/...] ou ?api=1&origin&destination
    // Com host maps.google.com o caminho pode vir sem o "/maps" inicial: normaliza para partes[0] = 'maps'
    const partes = u.pathname.split('/').filter(p => !!p).map(p => { try { return decodeURIComponent(p.replace(/\+/g, ' ')); } catch { return p; } });
    if (partes[0] !== 'maps') {
        partes.unshift('maps');
    }
    const saddr = u.searchParams.get('saddr');
    const daddr = u.searchParams.get('daddr');
    if (saddr && daddr) {
        return `${EMBED_MAPS}?saddr=${encodeURIComponent(saddr)}&daddr=${encodeURIComponent(daddr)}&output=embed`;
    }
    if (partes[1] === 'dir') {
        const paradas = partes.slice(2).filter(p => !!p.trim() && !p.startsWith('@') && !p.startsWith('data='));
        const viaApi = (u.searchParams.get('waypoints') ?? '').split('|').map(p => p.trim()).filter(p => !!p);
        const origem = u.searchParams.get('origin') ?? paradas[0];
        const destino = u.searchParams.get('destination') ?? paradas[paradas.length - 1];
        // Paradas do meio entram como "B to:C to:D" (formato clássico do embed, sem chave de API)
        const meio = u.searchParams.get('destination') ? viaApi : paradas.slice(1, -1);
        if (origem && destino && origem !== destino) {
            const daddrs = [...meio, destino].map(encodeURIComponent).join('+to:');
            return `${EMBED_MAPS}?saddr=${encodeURIComponent(origem)}&daddr=${daddrs}&output=embed`;
        }
        if (destino) {
            return embedBusca(destino);
        }
    }

    const q = u.searchParams.get('query') ?? u.searchParams.get('q');
    if (q) {
        return embedBusca(q);
    }
    // /maps/place/<nome>/@lat,lon,... ou /maps/search/<texto>
    if ((partes[1] === 'place' || partes[1] === 'search') && partes[2] && !partes[2].startsWith('@')) {
        return embedBusca(partes[2]);
    }
    const coords = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(u.pathname);
    if (coords) {
        return embedBusca(`${coords[1]},${coords[2]}`);
    }
    return null;
}

function embedBusca(consulta: string): string {
    return `${EMBED_MAPS}?q=${encodeURIComponent(consulta)}&z=15&output=embed`;
}
