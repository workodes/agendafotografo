namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Confirmação do e-mail do autocadastro: e-mail e senha da conta mais o código de 6 números (texto). Plano 18.</summary>
public class ConfirmarEmailModel
{
    public string Email { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
}
