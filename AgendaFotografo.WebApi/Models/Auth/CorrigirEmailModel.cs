namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>"Errei o e-mail": troca o e-mail de uma conta ainda não confirmada. <c>Email</c> é o atual.</summary>
public class CorrigirEmailModel
{
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
    public string EmailNovo { get; set; } = string.Empty;
}
