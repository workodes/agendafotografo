namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Definir a primeira senha de uma conta sem senha (só Google): código recebido por e-mail (6 números, texto) e a senha escolhida.</summary>
public class DefinirSenhaModel
{
    public string Codigo { get; set; } = string.Empty;
    public string NovaSenha { get; set; } = string.Empty;
}
