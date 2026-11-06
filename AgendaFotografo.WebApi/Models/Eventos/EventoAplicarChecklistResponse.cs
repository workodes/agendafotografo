namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Resposta do AplicarChecklist: quantas pendências entraram e a lista da ficha do evento (na ordem da ficha).</summary>
public class EventoAplicarChecklistResponse
{
    public int Adicionadas { get; set; }
    public List<EventoPendenciaItem> Itens { get; set; } = [];
}
