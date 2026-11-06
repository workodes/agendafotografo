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
