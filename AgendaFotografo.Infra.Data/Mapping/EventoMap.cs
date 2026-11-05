using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class EventoMap : BaseMap<Evento>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Evento> builder)
    {
        builder.ToTable("EVENTOS");

        builder.Property(x => x.EVE_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.EVE_NOME).IsRequired().HasMaxLength(200);
        builder.Property(x => x.EVE_TIPO_EVENTO_ID).IsRequired();
        builder.Property(x => x.EVE_DATA).IsRequired().HasColumnType("date");
        builder.Property(x => x.EVE_HORA).HasColumnType("time"); // nulo = "a confirmar"
        builder.Property(x => x.EVE_CIDADE).IsRequired().HasMaxLength(100);
        builder.Property(x => x.EVE_STATUS).IsRequired().HasConversion<int>();
        builder.Property(x => x.EVE_ORGANIZADOR_ID);
        builder.Property(x => x.EVE_LARGADA_LOCAL).HasMaxLength(300);
        builder.Property(x => x.EVE_LARGADA_LINK).HasMaxLength(500);
        builder.Property(x => x.EVE_CHEGADA_LOCAL).HasMaxLength(300);
        builder.Property(x => x.EVE_CHEGADA_LINK).HasMaxLength(500);
        builder.Property(x => x.EVE_LINK_INSCRICAO).HasMaxLength(500);
        builder.Property(x => x.EVE_LINK_FOTOS).HasMaxLength(500);
        builder.Property(x => x.EVE_ROTA_LINK_MAPS).HasMaxLength(500);
        builder.Property(x => x.EVE_ROTA_LINK_STRAVA).HasMaxLength(500);
        // Textos longos: longtext, sem HasMaxLength (limite de tamanho de linha do MySQL); o validator limita a 4000
        builder.Property(x => x.EVE_INFORMACOES).HasColumnType("longtext");
        builder.Property(x => x.EVE_OBSERVACOES_EQUIPE).HasColumnType("longtext");
        builder.Property(x => x.EVE_NOTAS_INTERNAS).HasColumnType("longtext");

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.EVE_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.TipoEvento)
            .WithMany()
            .HasForeignKey(x => x.EVE_TIPO_EVENTO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Organizador)
            .WithMany()
            .HasForeignKey(x => x.EVE_ORGANIZADOR_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.EVE_ASSINANTE_ID, x.EVE_DATA });
        builder.HasIndex(x => new { x.EVE_ASSINANTE_ID, x.EVE_ORGANIZADOR_ID });
        builder.HasIndex(x => new { x.EVE_ASSINANTE_ID, x.EVE_TIPO_EVENTO_ID });
    }
}
