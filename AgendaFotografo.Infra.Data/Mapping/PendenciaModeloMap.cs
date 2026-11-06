using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class PendenciaModeloMap : BaseMap<PendenciaModelo>
{
    protected override void ConfigureEntity(EntityTypeBuilder<PendenciaModelo> builder)
    {
        builder.ToTable("PENDENCIAMODELOS");

        builder.Property(x => x.PEM_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.PEM_TITULO).IsRequired().HasMaxLength(200);
        builder.Property(x => x.PEM_CATEGORIA).IsRequired();
        builder.Property(x => x.PEM_PRIORIDADE).IsRequired();
        builder.Property(x => x.PEM_ATIVO).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.PEM_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TipoEvento)
            .WithMany()
            .HasForeignKey(x => x.PEM_TIPO_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Modelos ativos do assinante (aplicação do checklist e listagem)
        builder.HasIndex(x => new { x.PEM_ASSINANTE_ID, x.PEM_ATIVO });
    }
}
