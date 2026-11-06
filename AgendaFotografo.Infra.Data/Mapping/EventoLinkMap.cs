using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoLinkMap : BaseMap<EventoLink>
{
    protected override void ConfigureEntity(EntityTypeBuilder<EventoLink> builder)
    {
        builder.ToTable("EVENTOLINKS");

        builder.Property(x => x.EVL_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EVL_EVENTO_ID).IsRequired();
        builder.Property(x => x.EVL_TOKEN).IsRequired().HasMaxLength(32);
        builder.Property(x => x.EVL_CODIGO).IsRequired().HasMaxLength(4);
        builder.Property(x => x.EVL_CARIMBO).IsRequired().HasMaxLength(32);
        builder.Property(x => x.EVL_ATIVO).IsRequired();
        builder.Property(x => x.EVL_MOSTRAR_EQUIPE).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EVL_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Evento)
            .WithMany()
            .HasForeignKey(x => x.EVL_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Um link por evento e token único no sistema
        builder.HasIndex(x => x.EVL_EVENTO_ID).IsUnique();
        builder.HasIndex(x => x.EVL_TOKEN).IsUnique();
        builder.HasIndex(x => x.EVL_ASSINANTE_ID);
    }
}
