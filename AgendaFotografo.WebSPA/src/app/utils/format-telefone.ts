// Exibe um telefone guardado só com dígitos: (00) 0000-0000 (10 dígitos) ou (00) 00000-0000 (11). Outro tamanho volta como veio.
export function formatTelefone(valor: string | null | undefined): string {
    const d = (valor ?? '').replace(/\D/g, '');
    if (d.length === 11) { return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; }
    if (d.length === 10) { return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; }
    return valor ?? '';
}
