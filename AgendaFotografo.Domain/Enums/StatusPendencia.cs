namespace AgendaFotografo.Domain.Enums;

/// <summary>Situação da pendência do evento. Valores fixos (trafegam como número no JSON e são gravados como int).</summary>
public enum StatusPendencia
{
    AFazer = 1,
    EmAndamento = 2,
    Concluida = 3
}
