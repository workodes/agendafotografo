using AgendaFotografo.CrossCutting.Services.Mail;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Infra.Data.Context;
using AgendaFotografo.WebApi.Services.Assinantes;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>Resultado do envio síncrono da confirmação: se falhou e quantos segundos faltam para liberar o reenvio.</summary>
public record EnvioConfirmacao(bool EnvioFalhou, int ReenviarEmSegundos);

/// <summary>
/// Monta e envia os três e-mails da conta (plano 18). Nenhuma exceção de envio sobe para quem chama: o serviço captura e registra só
/// UsuarioId, o tipo do e-mail e o tipo do erro (nunca código, e-mail, assunto ou corpo).
/// </summary>
public class EmailsConta(
    EfDbContext db,
    UserManager<Usuario> userManager,
    IEmailService emailService,
    FilaEmail fila,
    EmailModelos modelos,
    CodigoEmail codigos,
    IConfiguration configuration,
    ILogger<EmailsConta> logger)
{
    private static readonly TimeSpan LimiteConfirmacao = TimeSpan.FromSeconds(15);

    public bool Ligado => emailService.Ligado;

    private async Task<Assinante?> ObterAssinanteAsync(Usuario usuario, CancellationToken cancellationToken)
        => usuario.AssinanteId is null ? null
            : await db.Assinantes.AsNoTracking().FirstOrDefaultAsync(a => a.Id == usuario.AssinanteId, cancellationToken);

    private static string PrimeiroNome(string? nome)
    {
        var primeira = (nome ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).FirstOrDefault();
        return string.IsNullOrEmpty(primeira) ? "você" : primeira;
    }

    /// <summary>
    /// Confirmação: gera o código e envia de forma síncrona (limite de 15 s) para a tela saber se falhou. Falhou = o código é removido
    /// e o reenvio libera na hora. O prazo de 60 s só conta a partir de um envio bem-sucedido.
    /// </summary>
    public async Task<EnvioConfirmacao> EnviarConfirmacaoAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        try
        {
            var assinante = await ObterAssinanteAsync(usuario, cancellationToken);
            var codigo = await codigos.GerarAsync(usuario, FinalidadeCodigo.Confirmacao);
            try
            {
                var email = modelos.Montar(TipoEmailConta.Confirmacao, new Dictionary<string, string>
                {
                    ["PrimeiroNome"] = PrimeiroNome(assinante?.ASS_NOME ?? usuario.FullName),
                    ["Email"] = usuario.Email ?? string.Empty,
                    ["Codigo"] = codigo
                });

                using var limite = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                limite.CancelAfter(LimiteConfirmacao);
                await emailService.EnviarAsync(usuario.Email ?? string.Empty, assinante?.ASS_NOME ?? usuario.FullName,
                    email.Assunto, email.Html, email.Texto, limite.Token);
            }
            catch (Exception)
            {
                await codigos.RemoverAsync(usuario, FinalidadeCodigo.Confirmacao);
                throw;
            }
            return new EnvioConfirmacao(false, CodigoEmail.SegundosEntreEnvios);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Falha ao enviar e-mail de confirmação. UsuarioId={UsuarioId} Tipo={Tipo} Erro={Erro}",
                usuario.Id, TipoEmailConta.Confirmacao, ex.GetType().Name);
            return new EnvioConfirmacao(true, 0);
        }
    }

    /// <summary>Nova senha: gera o código e coloca o e-mail na fila (envio em segundo plano, sem revelar nada pela demora).</summary>
    public async Task EnfileirarNovaSenhaAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        try
        {
            var assinante = await ObterAssinanteAsync(usuario, cancellationToken);
            var codigo = await codigos.GerarAsync(usuario, FinalidadeCodigo.NovaSenha);
            var email = modelos.Montar(TipoEmailConta.NovaSenha, new Dictionary<string, string>
            {
                ["PrimeiroNome"] = PrimeiroNome(assinante?.ASS_NOME ?? usuario.FullName),
                ["Email"] = usuario.Email ?? string.Empty,
                ["Codigo"] = codigo
            });
            fila.Enfileirar(new EmailMensagem(usuario.Email ?? string.Empty, assinante?.ASS_NOME ?? usuario.FullName,
                email.Assunto, email.Html, email.Texto, nameof(TipoEmailConta.NovaSenha), usuario.Id));
        }
        catch (Exception ex)
        {
            logger.LogWarning("Falha ao preparar e-mail de nova senha. UsuarioId={UsuarioId} Tipo={Tipo} Erro={Erro}",
                usuario.Id, TipoEmailConta.NovaSenha, ex.GetType().Name);
        }
    }

    /// <summary>
    /// Boas-vindas (fila). Só para conta de origem Autocadastro, com o e-mail ligado, com prazo de teste (<c>ASS_TESTE_ATE</c> não nulo)
    /// e teste ainda em curso (dias restantes maiores que 0). Nos demais casos fica só um LogInformation. Nunca bloqueia nem falha.
    /// </summary>
    public async Task EnfileirarBoasVindasAsync(Usuario usuario, CancellationToken cancellationToken)
    {
        try
        {
            if (!Ligado) return;

            var assinante = await ObterAssinanteAsync(usuario, cancellationToken);
            if (assinante is null || assinante.ASS_ORIGEM != OrigemAssinante.Autocadastro) return;

            var diasRestantes = TesteGratis.DiasRestantes(assinante.ASS_TESTE_ATE, DateOnly.FromDateTime(DateTime.Now));
            if (diasRestantes is null or 0)
            {
                logger.LogInformation("Boas-vindas não enviadas (sem prazo de teste ou teste encerrado). AssinanteId={AssinanteId}", assinante.Id);
                return;
            }

            var email = usuario.Email ?? string.Empty;
            var linhaAcesso = await userManager.HasPasswordAsync(usuario)
                ? $"Para entrar, use {email} e a senha que você criou."
                : "Para entrar, use o botão Entrar com Google.";

            var montado = modelos.Montar(TipoEmailConta.BoasVindas, new Dictionary<string, string>
            {
                ["PrimeiroNome"] = PrimeiroNome(assinante.ASS_NOME),
                ["Email"] = email,
                ["DiasGratis"] = TesteGratis.ObterDiasGratis(configuration).ToString(),
                ["TesteAte"] = assinante.ASS_TESTE_ATE!.Value.ToString("dd/MM/yyyy"),
                ["LinhaAcesso"] = linhaAcesso
            });
            fila.Enfileirar(new EmailMensagem(email, assinante.ASS_NOME, montado.Assunto, montado.Html, montado.Texto,
                nameof(TipoEmailConta.BoasVindas), usuario.Id));
        }
        catch (Exception ex)
        {
            logger.LogWarning("Falha ao preparar e-mail de boas-vindas. UsuarioId={UsuarioId} Tipo={Tipo} Erro={Erro}",
                usuario.Id, TipoEmailConta.BoasVindas, ex.GetType().Name);
        }
    }
}
