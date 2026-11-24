// Valores em reais (pt-BR). A API trafega o valor como número com 2 casas.
const FORMATO = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FORMATO_COMPACTO = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

/** "R$ 1.234,56". Valor inválido vira "R$ 0,00". */
export function formatarMoeda(valor: number | null | undefined): string {
    return FORMATO.format(Number.isFinite(valor as number) ? (valor as number) : 0);
}

/** "R$ 1,2 mil" (eixos de gráfico). */
export function formatarMoedaCompacta(valor: number | null | undefined): string {
    return FORMATO_COMPACTO.format(Number.isFinite(valor as number) ? (valor as number) : 0);
}

/** "+ R$ 10,00" ou "- R$ 10,00" (sinal além da cor). O zero não leva sinal. */
export function formatarMoedaComSinal(valor: number | null | undefined, negativo: boolean): string {
    const texto = formatarMoeda(Math.abs(valor ?? 0));
    if (!valor) {
        return texto;
    }
    return `${negativo ? '-' : '+'} ${texto}`;
}

/** Saldo com sinal próprio: "R$ 10,00" positivo, "- R$ 10,00" negativo. */
export function formatarSaldo(valor: number | null | undefined): string {
    return (valor ?? 0) < 0 ? `- ${formatarMoeda(Math.abs(valor!))}` : formatarMoeda(valor);
}

/**
 * Campo de valor (ngx-mask "separator.2"): aceita número, ou texto "1.234,56" / "1234.56" / "1234,5".
 * Devolve null quando vazio ou inválido.
 */
export function lerValor(bruto: unknown): number | null {
    if (typeof bruto === 'number') {
        return Number.isFinite(bruto) ? Math.round(bruto * 100) / 100 : null;
    }
    if (typeof bruto !== 'string' || !bruto.trim()) {
        return null;
    }
    let t = bruto.trim();
    if (t.includes(',')) {
        // Formato pt-BR: "." é milhar e "," é decimal.
        t = t.replace(/\./g, '').replace(',', '.');
    }
    const n = Number(t);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}
