using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class PlanoModuloMap : BaseMap<PlanoModulo>
{
    protected override void ConfigureEntity(EntityTypeBuilder<PlanoModulo> builder)
    {
        builder.ToTable("PLANOMODULOS");

        builder.Property(x => x.PLM_PLANO_ID).IsRequired();
        builder.Property(x => x.PLM_MODULO).IsRequired().HasConversion<int>();
        builder.Property(x => x.PLM_TEXTO_LANDING).HasMaxLength(150);

        builder.HasOne(x => x.Plano)
            .WithMany()
            .HasForeignKey(x => x.PLM_PLANO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Um módulo só uma vez por plano (atende também a FK do plano, prefixo do índice)
        builder.HasIndex(x => new { x.PLM_PLANO_ID, x.PLM_MODULO }).IsUnique();
    }
}
