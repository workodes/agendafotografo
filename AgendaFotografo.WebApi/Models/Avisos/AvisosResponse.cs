namespace AgendaFotografo.WebApi.Models.Avisos;

/// <summary>Avisos do assinante. <see cref="Total"/> e <see cref="Criticos"/> são os valores reais, mesmo quando <see cref="Itens"/> é cortada no limite.</summary>
public class AvisosResponse
{
    public int Total { get; set; }
    public int Criticos { get; set; }
    public List<AvisoItem> Itens { get; set; } = [];
}
