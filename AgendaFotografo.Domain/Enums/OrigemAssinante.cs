namespace AgendaFotografo.Domain.Enums;

/// <summary>Como o assinante entrou no sistema. Valores fixos (trafegam como número no JSON e são gravados como int).</summary>
public enum OrigemAssinante
{
    Admin = 1,
    Autocadastro = 2
}
