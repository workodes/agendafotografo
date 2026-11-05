using Microsoft.AspNetCore.Identity;

namespace AgendaFotografo.Domain.Entities;

public class Usuario : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLogin { get; set; }

    /// <summary>Quando false, o login do usuário é bloqueado.</summary>
    public bool Ativo { get; set; } = true;

    /// <summary>Quando true, o usuário deve definir uma nova senha (ex.: admin criado pelo Seed fora do Development). O SPA força a troca.</summary>
    public bool ExigirTrocaSenha { get; set; }

    /// <summary>Assinante (tenant) a que o usuário com perfil Assinante pertence. Só o perfil Assinante tem vínculo (regra na API).</summary>
    public Guid? AssinanteId { get; set; }
    public Assinante? Assinante { get; set; }
}
