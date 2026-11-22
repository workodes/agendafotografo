using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoPessoalMap : BaseMap<EventoPessoal>
{
    protected override void ConfigureEntity(EntityTypeBuilder<EventoPessoal> builder)
    {
        builder.ToTable("EVENTOSPESSOAIS");

        builder.Property(x => x.EPS_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EPS_NOME).IsRequired().HasMaxLength(200);
        builder.Property(x => x.EPS_DATA).IsRequired().HasColumnType("date");
        builder.Property(x => x.EPS_HORA).HasColumnType("time"); // nulo = "a confirmar"
        builder.Property(x => x.EPS_CIDADE).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EPS_LOCAL).HasMaxLength(300);
        builder.Property(x => x.EPS_STATUS).IsRequired().HasConversion<int>();
        builder.Property(x => x.EPS_LINK).HasMaxLength(500);
        builder.Property(x => x.EPS_OBSERVACOES).HasMaxLength(2000);

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EPS_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.EPS_ASSINANTE_ID, x.EPS_DATA });
    }
}
