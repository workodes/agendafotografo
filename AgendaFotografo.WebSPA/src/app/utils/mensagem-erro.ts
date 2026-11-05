// A API devolve o erro como texto puro no corpo (400/404), às vezes com várias linhas (validação).
// Usa o texto quando existir; caso contrário (rede, 500 sem texto) a mensagem padrão.
export function mensagemErro(error: any, padrao: string): string {
    const texto = error?.error;
    if (typeof texto === 'string' && texto.trim()) {
        return texto.split('\n').map(l => l.trim()).filter(l => l).join('; ');
    }
    return padrao;
}
