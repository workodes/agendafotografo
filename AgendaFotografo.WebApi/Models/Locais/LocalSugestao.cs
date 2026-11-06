namespace AgendaFotografo.WebApi.Models.Locais;

/// <summary>Sugestão do autocomplete de locais (Geoapify) devolvida por <c>Local/Buscar</c>.</summary>
public class LocalSugestao
{
    /// <summary>Nome curto do lugar (ex.: "Parque Barigui") ou a primeira linha do endereço.</summary>
    public string Nome { get; set; } = string.Empty;

    /// <summary>Endereço completo, uma linha.</summary>
    public string Endereco { get; set; } = string.Empty;

    public string? Cidade { get; set; }
    public string? Uf { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    /// <summary>Link do Google Maps para as coordenadas (preenche os campos "link do Maps" da largada/chegada).</summary>
    public string LinkMaps { get; set; } = string.Empty;
}
