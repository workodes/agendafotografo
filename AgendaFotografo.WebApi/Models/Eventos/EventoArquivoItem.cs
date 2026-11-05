using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Arquivo do evento na saída. Nunca expõe o caminho de armazenamento (EVA_CAMINHO) nem o assinante.</summary>
public class EventoArquivoItem
{
    public Guid Id { get; set; }
    public TipoArquivoEvento EVA_TIPO { get; set; }
    public string EVA_NOME_ORIGINAL { get; set; } = string.Empty;
    public string EVA_CONTENT_TYPE { get; set; } = string.Empty;
    public long EVA_TAMANHO { get; set; }
}
