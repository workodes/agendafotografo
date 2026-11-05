using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.Domain.Entities;

/// <summary>Arquivo do evento (flyer, imagem do percurso ou GPX). Um de cada tipo por evento.</summary>
public class EventoArquivo : BaseEntity
{
    public Guid EVA_ASSINANTE_ID { get; set; }
    public Assinante? Assinante { get; set; }

    public Guid EVA_EVENTO_ID { get; set; }
    public Evento? Evento { get; set; }

    public TipoArquivoEvento EVA_TIPO { get; set; }

    /// <summary>Nome enviado pelo usuário (só para exibição e download).</summary>
    public string EVA_NOME_ORIGINAL { get; set; } = string.Empty;

    /// <summary>Chave do arquivo no armazenamento, gerada pelo servidor. Nunca sai na API.</summary>
    public string EVA_CAMINHO { get; set; } = string.Empty;

    public string EVA_CONTENT_TYPE { get; set; } = string.Empty;

    /// <summary>Tamanho em bytes.</summary>
    public long EVA_TAMANHO { get; set; }
}
