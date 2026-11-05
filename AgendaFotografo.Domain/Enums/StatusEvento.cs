namespace AgendaFotografo.Domain.Enums;

/// <summary>Situação do evento. Valores fixos (trafegam como número no JSON e são gravados como int).</summary>
public enum StatusEvento
{
    Pendente = 1,
    Confirmado = 2,
    Realizado = 3,
    Cancelado = 4
}
