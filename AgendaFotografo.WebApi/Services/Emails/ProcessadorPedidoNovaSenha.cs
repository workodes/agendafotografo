using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace AgendaFotografo.WebApi.Services.Emails;

/// <summary>
/// Consome a <see cref="FilaPedidoNovaSenha"/>: para cada e-mail cria um escopo, busca o usuário e só gera o código e envia se for
/// Assinante com senha e sem pedido nos últimos 60 s (vale também para conta inativa, bloqueada ou não confirmada).
/// Logs: só UsuarioId, tipo e tipo do erro; nunca e-mail nem código. Não é rotina agendada: não exige configuração especial no IIS.
/// </summary>
public class ProcessadorPedidoNovaSenha(
    FilaPedidoNovaSenha fila,
    IServiceScopeFactory scopeFactory,
    ILogger<ProcessadorPedidoNovaSenha> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var email in fila.Leitor.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await using var escopo = scopeFactory.CreateAsyncScope();
                    var userManager = escopo.ServiceProvider.GetRequiredService<UserManager<Usuario>>();
                    var codigos = escopo.ServiceProvider.GetRequiredService<CodigoEmail>();
                    var emailsConta = escopo.ServiceProvider.GetRequiredService<EmailsConta>();

                    var usuario = await userManager.FindByEmailAsync(email);
                    if (usuario is null
                        || !(await userManager.IsInRoleAsync(usuario, RoleNames.Assinante)
                             || await userManager.IsInRoleAsync(usuario, RoleNames.Fotografo))
                        || !await userManager.HasPasswordAsync(usuario)
                        || await codigos.SegundosParaReenviarAsync(usuario, FinalidadeCodigo.NovaSenha) != 0)
                        continue;

                    await emailsConta.EnfileirarNovaSenhaAsync(usuario, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    logger.LogWarning("Falha ao tratar pedido de nova senha. Tipo={Tipo} Erro={Erro}",
                        TipoEmailConta.NovaSenha, ex.GetType().Name);
                }
            }
        }
        catch (OperationCanceledException)
        {
            // API encerrando
        }
    }
}
