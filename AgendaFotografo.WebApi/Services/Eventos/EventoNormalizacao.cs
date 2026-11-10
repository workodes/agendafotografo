using AgendaFotografo.WebApi.Models.Eventos;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>Normalização da ficha do evento, única para o <c>EventoController</c> e o rascunho do assistente (<c>ProporEvento</c>).</summary>
public static class EventoNormalizacao
{
    /// <summary>Trim nos textos; opcional vazio vira nulo; organizador com Guid vazio vira nulo.</summary>
    public static void Normalizar(EventoModel m)
    {
        m.EVE_NOME = (m.EVE_NOME ?? string.Empty).Trim();
        m.EVE_CIDADE = (m.EVE_CIDADE ?? string.Empty).Trim();
        m.EVE_LOCAL = Texto(m.EVE_LOCAL);
        if (m.EVE_ORGANIZADOR_ID == Guid.Empty) m.EVE_ORGANIZADOR_ID = null;

        m.EVE_LARGADA_LOCAL = Texto(m.EVE_LARGADA_LOCAL);
        m.EVE_LARGADA_LINK = Texto(m.EVE_LARGADA_LINK);
        m.EVE_CHEGADA_LOCAL = Texto(m.EVE_CHEGADA_LOCAL);
        m.EVE_CHEGADA_LINK = Texto(m.EVE_CHEGADA_LINK);
        m.EVE_LINK_INSCRICAO = Texto(m.EVE_LINK_INSCRICAO);
        m.EVE_LINK_FOTOS = Texto(m.EVE_LINK_FOTOS);
        m.EVE_ROTA_LINK_MAPS = Texto(m.EVE_ROTA_LINK_MAPS);
        m.EVE_ROTA_LINK_STRAVA = Texto(m.EVE_ROTA_LINK_STRAVA);
        m.EVE_INFORMACOES = Texto(m.EVE_INFORMACOES);
        m.EVE_OBSERVACOES_EQUIPE = Texto(m.EVE_OBSERVACOES_EQUIPE);
        m.EVE_NOTAS_INTERNAS = Texto(m.EVE_NOTAS_INTERNAS);
    }

    public static string? Texto(string? valor)
    {
        var t = (valor ?? string.Empty).Trim();
        return t.Length == 0 ? null : t;
    }
}
