using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoMembroMap : BaseMap<EventoMembro>
{
    protected override void ConfigureEntity(EntityTypeBuilder<EventoMembro> builder)
    {
        builder.ToTable("EVENTOXMEMBRO");

        builder.Property(x => x.EVM_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EVM_EVENTO_ID).IsRequired();
        builder.Property(x => x.EVM_MEMBRO_ID).IsRequired();
        builder.Property(x => x.EVM_POSICAO).HasMaxLength(150);

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EVM_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Evento)
            .WithMany()
            .HasForeignKey(x => x.EVM_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Membro)
            .WithMany()
            .HasForeignKey(x => x.EVM_MEMBRO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Um membro só entra uma vez na escala do evento
        builder.HasIndex(x => new { x.EVM_EVENTO_ID, x.EVM_MEMBRO_ID }).IsUnique();
        builder.HasIndex(x => new { x.EVM_ASSINANTE_ID, x.EVM_MEMBRO_ID });
    }
}
