using System.Globalization;
using AgendaFotografo.CrossCutting.Services.IA;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Helpers;
using AgendaFotografo.WebApi.Models.Chat;
using AgendaFotografo.WebApi.Services.Chat;
using AgendaFotografo.WebApi.Services.CurrentUser;
using AgendaFotografo.WebApi.Services.Eventos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.AI;

namespace AgendaFotografo.WebApi.Controllers;

/// <summary>
/// Assistente com IA (OpenAI ou Azure OpenAI) que ajuda a lançar eventos. Sem tabela e sem migration: o histórico fica no SPA e é reenviado a
/// cada mensagem. A IA nunca grava: as ferramentas (<see cref="ChatFerramentas"/>) são de leitura e <c>ProporEvento</c> só monta um rascunho;
/// quem grava, ao confirmar, é o SPA, pelos endpoints de Evento. O assinante vem sempre de <see cref="AssinanteEscopo"/>.
/// Logs: só o Id do assinante, tokens e o tipo do erro; nunca o texto das mensagens, o rascunho nem a chave.
/// </summary>
/// <remarks>
/// Depende do <c>proxy_read_timeout 120s</c> do <c>location /api/</c> do nginx.conf do SPA (a chamada ao modelo tem timeout de 60 s).
/// O limite diário fica em memória: uma só instância da API.
/// </remarks>
[Authorize(Roles = RoleNames.Assinante)]
public class ChatController(
    IASettings settings,
    ChatLimiteDiario limiteDiario,
    ChatFerramentas ferramentas,
    IServiceProvider servicos,
    AssinanteEscopo assinanteEscopo,
    ILogger<ChatController> logger) : AgendaFotografoController
{
    private readonly IASettings _settings = settings;
    private readonly ChatLimiteDiario _limiteDiario = limiteDiario;
    private readonly ChatFerramentas _ferramentas = ferramentas;
    private readonly IServiceProvider _servicos = servicos;
    private readonly AssinanteEscopo _assinanteEscopo = assinanteEscopo;
    private readonly ILogger<ChatController> _logger = logger;

    private const int MaximoMensagens = 20;
    private const int MaximoTextoMensagem = 2000;
    private const int MaximoTextoTotal = 12000;
    private const int LimiteImagemBytes = 2 * 1024 * 1024;
    private const string TextoPadraoImagem = "Leia este flyer e monte o rascunho do evento.";
    private const string MsgImagemGrande = "A imagem deve ter no máximo 2 MB.";
    private const string MsgSegundoEvento = "Os outros eventos da mensagem ficam para depois: confirme este e me peça o próximo.";

    private const string MsgIndisponivel = "O assistente não está disponível.";
    private const string MsgFalhaModelo = "Não foi possível falar com o assistente agora. Tente de novo.";

    private IActionResult SemVinculo() => StatusCode(StatusCodes.Status403Forbidden, AssinanteEscopo.MensagemSemVinculo);

    private int LimiteDiario => _settings.LimiteDiario > 0 ? _settings.LimiteDiario : IASettings.LimiteDiarioPadrao;

    /// <summary><c>{ Ligado, LimiteDiario, UsadasHoje }</c>. Ligado = <see cref="IASettings.Ligado"/> (provedor conhecido, ApiKey e Modelo preenchidos e, no Azure, Endpoint válido).</summary>
    [HttpGet]
    public async Task<IActionResult> Status(CancellationToken cancellationToken)
    {
        try
        {
            var assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);

            Response.Headers.CacheControl = "no-store";
            return Ok(new ChatStatusResponse
            {
                Ligado = _settings.Ligado,
                LimiteDiario = LimiteDiario,
                UsadasHoje = _limiteDiario.UsadasHoje(assinanteId)
            });
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>
    /// Recebe o histórico da conversa (a última mensagem é do usuário, com imagem opcional do flyer) e devolve <c>{ Texto, Rascunho, Eventos }</c>, com no máximo um rascunho e 10 eventos citados.
    /// 400 em texto pt-BR (chat desligado, validação, falha do modelo); 429 ao passar do limite diário do assinante.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> Enviar([FromBody] ChatEnviarModel model, CancellationToken cancellationToken)
    {
        Guid assinanteId;
        try
        {
            assinanteId = await _assinanteEscopo.ObterAssinanteIdAsync(cancellationToken);
        }
        catch (AssinanteSemVinculoException) { return SemVinculo(); }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }

        try
        {
            if (!_settings.Ligado) return BadRequest(MsgIndisponivel);

            var chatClient = _servicos.GetService<IChatClient>();
            if (chatClient is null) return BadRequest(MsgIndisponivel);

            var erro = Validar(model, out var imagem);
            if (erro is not null) return BadRequest(erro);

            // Reserva antes de chamar o modelo (mensagem com imagem conta como 1)
            if (!_limiteDiario.TentarReservar(assinanteId, LimiteDiario))
                return StatusCode(StatusCodes.Status429TooManyRequests,
                    $"Você atingiu o limite de {LimiteDiario} mensagens de hoje. Tente de novo amanhã.");

            var mensagens = new List<ChatMessage> { new(ChatRole.System, ChatPrompt.Montar(DateTime.Now)) };
            for (var i = 0; i < model.Mensagens.Count; i++)
            {
                var m = model.Mensagens[i];
                var texto = m.Texto.Trim();
                if (m.Papel == PapelChat.Assistente)
                {
                    // Resposta longa do assistente é cortada, não recusada
                    if (texto.Length > MaximoTextoMensagem) texto = texto[..MaximoTextoMensagem];
                    if (m.Rascunho is not null) texto += "\n\n" + ResumirRascunho(m.Rascunho);
                    mensagens.Add(new ChatMessage(ChatRole.Assistant, texto));
                }
                else if (i == model.Mensagens.Count - 1 && imagem is not null)
                {
                    // Os bytes ficam só em memória durante a requisição: nunca logados, gravados nem guardados em cache
                    if (texto.Length == 0) texto = TextoPadraoImagem;
                    mensagens.Add(new ChatMessage(ChatRole.User, [new TextContent(texto), new DataContent(imagem.Bytes, imagem.MediaType)]));
                }
                else
                {
                    mensagens.Add(new ChatMessage(ChatRole.User, texto));
                }
            }

            var opcoes = new ChatOptions { Tools = _ferramentas.Montar(assinanteId) };

            ChatResponse resposta;
            using (var limite = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken))
            {
                limite.CancelAfter(IAExtensions.TimeoutChamada);
                try
                {
                    resposta = await chatClient.GetResponseAsync(mensagens, opcoes, limite.Token);
                }
                catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
                {
                    // Falha, timeout ou filtro de conteúdo do provedor: sem texto de mensagem nem detalhes do erro no log
                    _logger.LogWarning("Falha ao falar com o assistente. AssinanteId={AssinanteId} Erro={Erro}", assinanteId, ex.GetType().Name);
                    return BadRequest(MsgFalhaModelo);
                }
            }

            _logger.LogInformation(
                "Uso do assistente. AssinanteId={AssinanteId} ComImagem={ComImagem} TokensEntrada={Entrada} TokensSaida={Saida} TokensTotal={Total}",
                assinanteId, imagem is not null, resposta.Usage?.InputTokenCount, resposta.Usage?.OutputTokenCount, resposta.Usage?.TotalTokenCount);

            var rascunho = _ferramentas.Rascunho;
            var texto2 = (resposta.Text ?? string.Empty).Trim();
            if (texto2.Length == 0)
                texto2 = rascunho is not null
                    ? "Montei o rascunho abaixo. Confira os dados e confirme."
                    : "Não consegui responder agora. Pode reformular a mensagem?";

            // Segundo evento na mesma resposta: a frase fixa vem do servidor; o texto é cortado em 2.000 sem perder a frase
            if (_ferramentas.SegundaPropostaRecusada && !texto2.Contains(MsgSegundoEvento, StringComparison.Ordinal))
            {
                var limiteBase = MaximoTextoMensagem - MsgSegundoEvento.Length - 2;
                if (texto2.Length > limiteBase) texto2 = texto2[..limiteBase];
                texto2 += "\n\n" + MsgSegundoEvento;
            }
            if (texto2.Length > MaximoTextoMensagem) texto2 = texto2[..MaximoTextoMensagem];

            Response.Headers.CacheControl = "no-store";
            return Ok(new ChatEnviarResponse { Texto = texto2, Rascunho = rascunho, Eventos = [.. _ferramentas.Eventos] });
        }
        catch (Exception ex)
        {
            return BadRequest(ErrorHelper.Seguro(ex, _logger));
        }
    }

    /// <summary>Imagem validada: bytes decodificados e o tipo detectado pela assinatura (o MediaType informado é ignorado).</summary>
    private sealed record ImagemValidada(byte[] Bytes, string MediaType);

    /// <summary>
    /// Validação do histórico (mensagens de erro em pt-BR). Nulo quando está tudo certo. O limite de 2.000 caracteres vale só para o usuário;
    /// mensagens do assistente acima disso são cortadas ao montar o histórico (e contam já cortadas no total).
    /// </summary>
    private static string? Validar(ChatEnviarModel? model, out ImagemValidada? imagem)
    {
        imagem = null;
        if (model?.Mensagens is null || model.Mensagens.Count == 0) return "Escreva uma mensagem.";
        if (model.Mensagens.Count > MaximoMensagens) return $"A conversa pode ter no máximo {MaximoMensagens} mensagens. Comece uma nova conversa.";
        if (model.Mensagens.Any(m => m is null)) return "Mensagem inválida.";
        if (model.Mensagens.Any(m => !Enum.IsDefined(m.Papel))) return "Mensagem inválida.";

        // Imagem só na última mensagem e só no papel Usuário
        var ultimo = model.Mensagens.Count - 1;
        for (var i = 0; i < ultimo; i++)
            if (model.Mensagens[i].Imagem is not null) return "Mensagem inválida.";
        var temImagem = model.Mensagens[ultimo].Imagem is not null;
        if (temImagem && model.Mensagens[ultimo].Papel != PapelChat.Usuario) return "Mensagem inválida.";

        for (var i = 0; i < model.Mensagens.Count; i++)
        {
            var m = model.Mensagens[i];
            m.Texto ??= string.Empty;
            // Texto vazio só é aceito na última mensagem quando há imagem
            if (string.IsNullOrWhiteSpace(m.Texto) && !(i == ultimo && temImagem)) return "Escreva uma mensagem.";
            if (m.Papel == PapelChat.Usuario && m.Texto.Length > MaximoTextoMensagem)
                return $"Cada mensagem pode ter no máximo {MaximoTextoMensagem} caracteres.";
        }

        if (model.Mensagens.Sum(m => m.Papel == PapelChat.Assistente ? Math.Min(m.Texto.Length, MaximoTextoMensagem) : m.Texto.Length) > MaximoTextoTotal)
            return $"A conversa pode ter no máximo {MaximoTextoTotal} caracteres. Comece uma nova conversa.";
        if (model.Mensagens[ultimo].Papel != PapelChat.Usuario) return "A última mensagem precisa ser do usuário.";

        if (temImagem)
        {
            var erroImagem = ValidarImagem(model.Mensagens[ultimo].Imagem!, out imagem);
            if (erroImagem is not null) return erroImagem;
        }
        return null;
    }

    /// <summary>Base64 válido, até 2 MB decodificados e assinatura JPG, PNG ou WEBP. Nada é gravado nem logado.</summary>
    private static string? ValidarImagem(ChatImagemModel img, out ImagemValidada? validada)
    {
        validada = null;
        var base64 = img.Base64 ?? string.Empty;
        if (base64.Length == 0) return "Imagem inválida.";

        // Evita alocar o buffer quando o texto já é grande demais (4 caracteres de Base64 = 3 bytes)
        if ((long)base64.Length / 4 * 3 > LimiteImagemBytes + 4096) return MsgImagemGrande;

        var buffer = new byte[base64.Length / 4 * 3 + 3];
        if (!Convert.TryFromBase64String(base64, buffer, out var escritos)) return "Imagem inválida.";
        if (escritos == 0) return "Imagem inválida.";
        if (escritos > LimiteImagemBytes) return MsgImagemGrande;

        var tipo = ArquivoEventoRegras.DetectarImagem(buffer.AsSpan(0, escritos));
        if (tipo is null) return "A imagem deve ser JPG, PNG ou WEBP.";

        validada = new ImagemValidada(buffer.AsSpan(0, escritos).ToArray(), tipo);
        return null;
    }

    private static string Linha(string? texto, int max)
    {
        var t = (texto ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ').Trim();
        return t.Length > max ? t[..max] : t;
    }

    /// <summary>
    /// Resumo textual do rascunho (no estado atual do card) para o histórico enviado ao modelo, útil nos refinamentos ("muda para 8h").
    /// Os ids que vêm do cliente aqui são só texto: o ProporEvento os revalida no banco.
    /// </summary>
    private static string ResumirRascunho(ChatRascunho r)
    {
        var e = r.Evento;
        var partes = new List<string>
        {
            $"nome=\"{Linha(e.EVE_NOME, 200)}\"",
            $"tipoEventoId={e.EVE_TIPO_EVENTO_ID} ({Linha(e.TipoEventoNome, 60)})",
            $"data={e.EVE_DATA:yyyy-MM-dd}",
            $"hora={(e.EVE_HORA is null ? "a confirmar" : e.EVE_HORA.Value.ToString("HH:mm", CultureInfo.InvariantCulture))}",
            $"cidade=\"{Linha(e.EVE_CIDADE, 100)}\""
        };
        if (!string.IsNullOrWhiteSpace(e.EVE_LOCAL)) partes.Add($"local=\"{Linha(e.EVE_LOCAL, 200)}\"");
        if (!string.IsNullOrWhiteSpace(e.EVE_LINK_INSCRICAO)) partes.Add($"linkInscricao=\"{Linha(e.EVE_LINK_INSCRICAO, 500)}\"");
        if (e.EVE_ORGANIZADOR_ID is not null) partes.Add($"organizadorId={e.EVE_ORGANIZADOR_ID} ({Linha(e.OrganizadorNome, 200)})");
        if (!string.IsNullOrWhiteSpace(e.EVE_INFORMACOES)) partes.Add($"informacoes=\"{Linha(e.EVE_INFORMACOES, 300)}\"");

        var membros = (r.Membros ?? []).Take(20).Select(m =>
            $"{Linha(m.MEM_NOME, 100)} (membroId={m.EVM_MEMBRO_ID}{(string.IsNullOrWhiteSpace(m.EVM_POSICAO) ? "" : $", posição={Linha(m.EVM_POSICAO, 150)}")})");
        partes.Add("equipe=[" + string.Join("; ", membros) + "]");

        return "[Rascunho exibido ao usuário, no estado atual do card: " + string.Join(", ", partes) + "]";
    }
}
