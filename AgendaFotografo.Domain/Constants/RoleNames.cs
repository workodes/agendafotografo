namespace AgendaFotografo.Domain.Constants;

public static class RoleNames
{
    public const string Admin = nameof(Admin);
    public const string Assinante = nameof(Assinante);

    public static readonly HashSet<string> All = [Admin, Assinante];
}
