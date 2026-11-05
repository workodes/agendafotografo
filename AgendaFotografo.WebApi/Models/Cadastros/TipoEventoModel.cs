namespace AgendaFotografo.WebApi.Models.Cadastros;

/// <summary>
/// Ficha do tipo de evento (entrada e saída). Nomes C# exatos no JSON. Na entrada só são lidos Id e TPE_NOME;
/// TPE_ATIVO é somente de saída (a situação muda pelas actions Inativar/Ativar). O assinante nunca trafega.
/// </summary>
public class TipoEventoModel
{
    public Guid? Id { get; set; }
    public string TPE_NOME { get; set; } = string.Empty;

    // Somente saída
    public bool TPE_ATIVO { get; set; }
}
