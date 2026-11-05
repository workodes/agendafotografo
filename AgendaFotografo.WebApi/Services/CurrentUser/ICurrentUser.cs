namespace AgendaFotografo.WebApi.Services.CurrentUser;

public class UserIdentity
{
    public string Id { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}

public interface ICurrentUser
{
    UserIdentity UserIdentity { get; }
    bool IsAdmin { get; }
    bool IsAssinante { get; }
}
