using System.Security.Claims;
using AgendaFotografo.Domain.Constants;

namespace AgendaFotografo.WebApi.Services.CurrentUser;

public class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private readonly ClaimsPrincipal? _user = httpContextAccessor.HttpContext?.User;

    public UserIdentity UserIdentity => new()
    {
        Id = _user?.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty,
        Role = _user?.FindFirstValue(ClaimTypes.Role) ?? string.Empty
    };

    public bool IsAdmin => UserIdentity.Role == RoleNames.Admin;
    public bool IsAssinante => UserIdentity.Role == RoleNames.Assinante;
}
