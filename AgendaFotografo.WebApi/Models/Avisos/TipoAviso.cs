namespace AgendaFotografo.WebApi.Models.Avisos;

/// <summary>Tipo do aviso. Valores fixos (trafegam como número no JSON; manter sincronia com o front). Não persistido.</summary>
public enum TipoAviso
{
    PendenciasVencidas = 1,
    PendenciasVencendo = 2,
    EventoProximo = 3,
    ConflitoEscala = 4,
    EventosPassadosSemBaixa = 5
}
