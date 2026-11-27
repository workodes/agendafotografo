using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models;

public class LoginModel
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiraEm { get; set; }
    public string Id { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool ExigirTrocaSenha { get; set; }

    /// <summary>Falso quando a conta entra só pelo Google (sem senha): o SPA esconde "Alterar senha".</summary>
    public bool TemSenha { get; set; }

    /// <summary>Nome do assinante (só perfil Assinante; null para o Admin). O AssinanteId NÃO é exposto.</summary>
    public string? AssinanteNome { get; set; }

    /// <summary>Nome do plano da conta (plano 24); nulo para Admin, Fotografo (Gratuito) e conta sem plano.</summary>
    public string? PlanoNome { get; set; }

    /// <summary>
    /// Módulos liberados pelo plano (plano 24; números do enum <see cref="ModuloPlano"/>). Nulo para Admin e Fotografo (Gratuito, que não
    /// passa pelo filtro de módulos) e na resposta pendente; lista vazia = Assinante só com a base.
    /// </summary>
    public ModuloPlano[]? Modulos { get; set; }

    /// <summary>Verdadeiro quando o e-mail da conta ainda precisa ser confirmado (plano 18): <c>Token</c> vem vazio e só valem <c>Email</c>, <c>EnvioFalhou</c> e <c>ReenviarEmSegundos</c>.</summary>
    public bool ConfirmacaoPendente { get; set; }

    /// <summary>Verdadeiro só quando o envio do código deste pedido falhou.</summary>
    public bool EnvioFalhou { get; set; }

    /// <summary>Segundos até liberar "Reenviar código" (0 a 60).</summary>
    public int ReenviarEmSegundos { get; set; }
}
