export function arrayParaString(valores: string[], separador = ','): string {
    if (!valores.length)
        return null;

    return valores.join(separador);
}
