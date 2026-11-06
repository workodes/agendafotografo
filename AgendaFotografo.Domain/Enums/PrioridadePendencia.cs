namespace AgendaFotografo.Domain.Enums;

/// <summary>Prioridade da pendência. A ordem crescente põe a mais urgente primeiro. Valores fixos (número no JSON, int no banco).</summary>
public enum PrioridadePendencia
{
    Alta = 1,
    Media = 2,
    Baixa = 3
}
