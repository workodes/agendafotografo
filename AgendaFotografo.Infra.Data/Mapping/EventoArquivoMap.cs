using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoArquivoMap : BaseMap<EventoArquivo>
{
    protected override void ConfigureEntity(EntityTypeBuilder<EventoArquivo> builder)
    {
        builder.ToTable("EVENTOARQUIVOS");

        builder.Property(x => x.EVA_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EVA_EVENTO_ID).IsRequired();
        builder.Property(x => x.EVA_TIPO).IsRequired().HasConversion<int>();
        builder.Property(x => x.EVA_NOME_ORIGINAL).IsRequired().HasMaxLength(255);
        builder.Property(x => x.EVA_CAMINHO).IsRequired().HasMaxLength(300);
        builder.Property(x => x.EVA_CONTENT_TYPE).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EVA_TAMANHO).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EVA_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Evento)
            .WithMany()
            .HasForeignKey(x => x.EVA_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Um arquivo de cada tipo por evento
        builder.HasIndex(x => new { x.EVA_EVENTO_ID, x.EVA_TIPO }).IsUnique();
        builder.HasIndex(x => x.EVA_ASSINANTE_ID);
    }
}
