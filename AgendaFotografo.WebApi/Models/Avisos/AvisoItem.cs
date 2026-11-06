namespace AgendaFotografo.WebApi.Models.Avisos;

/// <summary>
/// Um aviso calculado na hora. Textos prontos em pt-BR; a rota de destino é montada no SPA. Nunca traz notas internas
/// nem dados do organizador.
/// </summary>
public class AvisoItem
{
    /// <summary>Texto estável (mesma situação = mesma chave); serve de <c>trackBy</c> no front.</summary>
    public string Chave { get; set; } = string.Empty;

    public TipoAviso Tipo { get; set; }
    public GravidadeAviso Gravidade { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descricao { get; set; } = string.Empty;

    /// <summary>Problemas ou eventos do aviso, em texto pronto (vazio quando não há).</summary>
    public List<string> Detalhes { get; set; } = [];

    /// <summary>Quantidade de itens nos avisos agrupados (pendências ou eventos); 0 nos demais.</summary>
    public int Quantidade { get; set; }

    public Guid? EventoId { get; set; }

    /// <summary>"yyyy-MM-dd": data do evento, do conflito ou do evento mais antigo sem baixa; nula nas pendências.</summary>
    public DateOnly? Data { get; set; }

    public Guid? MembroId { get; set; }
}
