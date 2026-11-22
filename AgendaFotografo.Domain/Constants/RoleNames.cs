namespace AgendaFotografo.Domain.Constants;

public static class RoleNames
{
    public const string Admin = nameof(Admin);
    public const string Assinante = nameof(Assinante);
    public const string Fotografo = nameof(Fotografo);

    public static readonly HashSet<string> All = [Admin, Assinante, Fotografo];

    /// <summary>Perfis que têm conta própria de assinante (tenant): Assinante (coordenador) e Fotografo.</summary>
    public static readonly HashSet<string> ComConta = [Assinante, Fotografo];
}
