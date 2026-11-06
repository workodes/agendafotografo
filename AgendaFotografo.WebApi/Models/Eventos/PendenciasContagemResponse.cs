namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Contadores dos filtros rápidos da tela Pendências (só eventos não cancelados; respeitam prioridade e responsável).</summary>
public class PendenciasContagemResponse
{
    /// <summary>A fazer ou Em andamento.</summary>
    public int Abertas { get; set; }
    /// <summary>Abertas com prazo antes de hoje.</summary>
    public int Vencidas { get; set; }
    /// <summary>Abertas com prazo de hoje até hoje + 3.</summary>
    public int Vencendo { get; set; }
    public int Concluidas { get; set; }
    public int Ignoradas { get; set; }
}
