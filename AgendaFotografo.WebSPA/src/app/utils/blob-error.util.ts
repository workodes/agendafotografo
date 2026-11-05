/**
 * Requisições com `responseType: 'blob'` também trazem o corpo de uma resposta de erro como
 * Blob (não como string já parseada) — `error.error` nunca é a mensagem enviada pela API nesses
 * casos. A API devolve o erro via `BadRequest(ErrorHelper.GetException(ex))`: como
 * o controller base da API herda de `Controller` (sem `[ApiController]`), esse `BadRequest(string)`
 * é serializado pelo `StringOutputFormatter` do ASP.NET Core como texto puro
 * (`Content-Type: text/plain`), sem aspas de JSON — confirmado batendo direto num endpoint com o
 * mesmo padrão (`Auth/SignIn`). Por isso a leitura aqui é texto puro, sem tentar `JSON.parse`.
 */
export async function extrairMensagemErroBlob(error: unknown, mensagemPadrao: string): Promise<string> {
    const corpo = (error as { error?: unknown })?.error;

    if (!(corpo instanceof Blob))
        return mensagemPadrao;

    const texto = (await corpo.text()).trim();

    return texto || mensagemPadrao;
}
