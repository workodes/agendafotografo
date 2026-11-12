// Formatação do teste grátis a partir dos dias que a API calculou (DiasRestantes / TesteDiasRestantes).
// O cálculo dos dias é só da API; aqui só texto e a regra de destaque.

/** Nos últimos 3 dias (e depois de encerrado) o aviso vai em destaque. */
export function testeEmAlerta(dias: number | null | undefined): boolean {
    return dias != null && dias <= 3;
}

/** "N dias restantes", "1 dia restante" ou "Encerrado"; "Sem prazo" quando não há data. */
export function textoTeste(dias: number | null | undefined): string {
    if (dias == null)
        return 'Sem prazo';
    if (dias <= 0)
        return 'Encerrado';
    return dias === 1 ? '1 dia restante' : `${dias} dias restantes`;
}

/** Texto do cabeçalho: "Teste grátis: N dias restantes" ou "Teste encerrado". Nulo = não mostrar. */
export function textoTesteCabecalho(dias: number | null | undefined): string | null {
    if (dias == null)
        return null;
    return dias <= 0 ? 'Teste encerrado' : `Teste grátis: ${textoTeste(dias)}`;
}

/** Forma curta (celular): "N dias de teste" ou "Teste encerrado". */
export function textoTesteCurto(dias: number | null | undefined): string | null {
    if (dias == null)
        return null;
    if (dias <= 0)
        return 'Teste encerrado';
    return dias === 1 ? '1 dia de teste' : `${dias} dias de teste`;
}
