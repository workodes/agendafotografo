export function stringParaArray(valor: string, separador = ','): string[] {
    if (!valor)
        return [];

    return valor.split(separador).map(item => item.trim()).filter(Boolean);
}