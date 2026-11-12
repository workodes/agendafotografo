namespace AgendaFotografo.WebApi.Models.Auth;

public class LoginGoogleResponse
{
    /// <summary>Verdadeiro quando o e-mail do Google ainda não tem cadastro: o SPA abre a etapa "Complete seu cadastro".</summary>
    public bool PrecisaCompletar { get; set; }

    /// <summary>Preenchido só quando <see cref="PrecisaCompletar"/> é falso.</summary>
    public LoginResponse? Login { get; set; }

    /// <summary>Nome e e-mail do Google; preenchidos só quando <see cref="PrecisaCompletar"/> é verdadeiro.</summary>
    public string? Nome { get; set; }
    public string? Email { get; set; }
}
