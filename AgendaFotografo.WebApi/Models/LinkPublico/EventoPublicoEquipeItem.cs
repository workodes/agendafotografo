using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.LinkPublico;

/// <summary>Membro da escala na página pública. Sem e-mail, telefone ou observações.</summary>
public class EventoPublicoEquipeItem
{
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public string? EVM_POSICAO { get; set; }
}
