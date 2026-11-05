namespace AgendaFotografo.Domain.Enums;

/// <summary>Tipo do arquivo anexado ao evento. Valores fixos (trafegam como número no JSON e são gravados como int).</summary>
public enum TipoArquivoEvento
{
    Flyer = 1,
    ImagemRota = 2,
    Gpx = 3
}
