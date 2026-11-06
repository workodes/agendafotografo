using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoPendenciaMap : BaseMap<EventoPendencia>
{
    protected override void ConfigureEntity(EntityTypeBuilder<EventoPendencia> builder)
    {
        builder.ToTable("EVENTOPENDENCIAS");

        builder.Property(x => x.EVP_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EVP_EVENTO_ID).IsRequired();
        builder.Property(x => x.EVP_TITULO).IsRequired().HasMaxLength(200);
        builder.Property(x => x.EVP_CATEGORIA).IsRequired();
        builder.Property(x => x.EVP_PRIORIDADE).IsRequired();
        builder.Property(x => x.EVP_STATUS).IsRequired();
        builder.Property(x => x.EVP_PRAZO).HasColumnType("date");
        builder.Property(x => x.EVP_OBSERVACOES).HasMaxLength(2000);

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EVP_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Evento)
            .WithMany()
            .HasForeignKey(x => x.EVP_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Membro)
            .WithMany()
            .HasForeignKey(x => x.EVP_MEMBRO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Lista geral e Painel: pendências do assinante por status e prazo
        builder.HasIndex(x => new { x.EVP_ASSINANTE_ID, x.EVP_STATUS, x.EVP_PRAZO });
    }
}
