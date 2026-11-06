namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Situação do link público do evento (saída para o coordenador). Sem link: <c>Configurado = false</c> e o resto vazio.</summary>
public class EventoLinkItem
{
    public bool Configurado { get; set; }
    public bool EVL_ATIVO { get; set; }
    public bool EVL_MOSTRAR_EQUIPE { get; set; }
    public string? EVL_TOKEN { get; set; }

    /// <summary>Código de 4 dígitos (texto, "0427"). Só vai ao coordenador dono do evento, com Cache-Control no-store.</summary>
    public string? Codigo { get; set; }
}
