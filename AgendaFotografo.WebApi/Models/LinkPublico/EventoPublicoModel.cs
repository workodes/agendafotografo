namespace AgendaFotografo.WebApi.Models.LinkPublico;

/// <summary>
/// Lista branca do que a página pública mostra, montada campo a campo (a entidade nunca é serializada). Nunca entram Ids, assinante,
/// tipo, status (só <see cref="Cancelado"/>), link de inscrição, notas internas, pendências ou contato dos membros. Do organizador saem
/// só <see cref="OrganizadorNome"/> e <see cref="OrganizadorTelefone"/> (decisão do colaborador em 26/11/2026); Id, contato, e-mail,
/// Instagram, notas e ativo do organizador nunca saem.
/// </summary>
public class EventoPublicoModel
{
    public string EVE_NOME { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly EVE_DATA { get; set; }

    /// <summary>"HH:mm:ss" ou nulo ("a confirmar").</summary>
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public bool Cancelado { get; set; }

    public string? EVE_LARGADA_LOCAL { get; set; }
    public string? EVE_LARGADA_LINK { get; set; }
    public string? EVE_CHEGADA_LOCAL { get; set; }
    public string? EVE_CHEGADA_LINK { get; set; }
    public string? EVE_INFORMACOES { get; set; }
    public string? EVE_ROTA_LINK_MAPS { get; set; }
    public string? EVE_ROTA_LINK_STRAVA { get; set; }
    public string? EVE_LINK_FOTOS { get; set; }
    public string? EVE_OBSERVACOES_EQUIPE { get; set; }

    /// <summary>Nome do organizador (ativo ou inativo, do mesmo assinante do evento); nulo quando o evento não tem organizador.</summary>
    public string? OrganizadorNome { get; set; }

    /// <summary>Telefone do organizador, só dígitos como gravado em ORG_TELEFONE; nulo sem organizador ou sem telefone.</summary>
    public string? OrganizadorTelefone { get; set; }

    public bool TemFlyer { get; set; }
    public bool TemImagemRota { get; set; }
    public string? GpxNome { get; set; }

    /// <summary>Nula quando o coordenador não liga "mostrar equipe".</summary>
    public List<EventoPublicoEquipeItem>? Equipe { get; set; }
}
