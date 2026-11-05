namespace AgendaFotografo.WebApi.Models.Cadastros;

public class TipoEventoListItem
{
    public Guid Id { get; set; }
    public string TPE_NOME { get; set; } = string.Empty;
    public bool TPE_ATIVO { get; set; }
}
