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

    /// <summary>Nome do assinante (só perfil Assinante; null para o Admin). O AssinanteId NÃO é exposto.</summary>
    public string? AssinanteNome { get; set; }
}
