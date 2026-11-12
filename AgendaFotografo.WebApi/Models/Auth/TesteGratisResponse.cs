namespace AgendaFotografo.WebApi.Models.Auth;

public class TesteGratisResponse
{
    /// <summary>"yyyy-MM-dd"; nulo = sem prazo.</summary>
    public DateOnly? ASS_TESTE_ATE { get; set; }

    /// <summary>Nulo = sem prazo; 0 = teste encerrado.</summary>
    public int? DiasRestantes { get; set; }
}
