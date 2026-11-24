using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class GastoFixoMap : BaseMap<GastoFixo>
{
    protected override void ConfigureEntity(EntityTypeBuilder<GastoFixo> builder)
    {
        builder.ToTable("GASTOSFIXOS");

        builder.Property(x => x.GAF_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.GAF_TITULO).IsRequired().HasMaxLength(200);
        builder.Property(x => x.GAF_VALOR).IsRequired().HasColumnType("decimal(12,2)");
        builder.Property(x => x.GAF_CATEGORIA).IsRequired().HasConversion<int>();
        builder.Property(x => x.GAF_DIA).IsRequired();
        builder.Property(x => x.GAF_ATIVO).IsRequired();
        builder.Property(x => x.GAF_GERADO_ATE).HasColumnType("date");

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.GAF_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.GAF_ASSINANTE_ID, x.GAF_ATIVO });
    }
}
