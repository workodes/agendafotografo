namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Pede outro código de confirmação. A senha é conferida pela mesma regra do Login (com bloqueio por tentativas).</summary>
public class ReenviarCodigoModel
{
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
