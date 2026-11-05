using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Cadastros;

public class MembroListItem
{
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public string? MEM_EMAIL { get; set; }
    public string? MEM_TELEFONE { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public bool MEM_ATIVO { get; set; }
}
