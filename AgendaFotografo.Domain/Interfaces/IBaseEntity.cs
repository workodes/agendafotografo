namespace AgendaFotografo.Domain.Interfaces;

public interface IBaseEntity
{
    Guid Id { get; set; }
    DateTime? CreatedAt { get; set; }
    DateTime? UpdatedAt { get; set; }
}
