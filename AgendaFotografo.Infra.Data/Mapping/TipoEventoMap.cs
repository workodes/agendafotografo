using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class TipoEventoMap : BaseMap<TipoEvento>
{
    protected override void ConfigureEntity(EntityTypeBuilder<TipoEvento> builder)
    {
        builder.ToTable("TIPOSEVENTO");

        builder.Property(x => x.TPE_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.TPE_NOME).IsRequired().HasMaxLength(60);
        builder.Property(x => x.TPE_ATIVO).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.TPE_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Único por assinante (a collation padrão do MySQL não diferencia maiúsculas; a API também checa)
        builder.HasIndex(x => new { x.TPE_ASSINANTE_ID, x.TPE_NOME }).IsUnique();
    }
}
