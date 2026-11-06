// "Local · Cidade" ou só "Cidade" quando o evento não tem local (EVE_LOCAL é opcional e pode vir nulo).
export function localCidade(e: { EVE_LOCAL?: string | null; EVE_CIDADE?: string | null } | null | undefined): string {
    return [e?.EVE_LOCAL?.trim(), e?.EVE_CIDADE?.trim()].filter(x => !!x).join(' · ');
}
