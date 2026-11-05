using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class MembroMap : BaseMap<Membro>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Membro> builder)
    {
        builder.ToTable("MEMBROS");

        builder.Property(x => x.MEM_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.MEM_NOME).IsRequired().HasMaxLength(200);
        builder.Property(x => x.MEM_INSTAGRAM).HasMaxLength(100);
        builder.Property(x => x.MEM_EMAIL).HasMaxLength(150);
        builder.Property(x => x.MEM_TELEFONE).HasMaxLength(20);
        builder.Property(x => x.MEM_FUNCAO).IsRequired().HasConversion<int>();
        builder.Property(x => x.MEM_OBSERVACOES).HasMaxLength(2000);
        builder.Property(x => x.MEM_ATIVO).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.MEM_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => new { x.MEM_ASSINANTE_ID, x.MEM_NOME });
        // Não único: o campo aceita nulo e a unicidade do @instagram por assinante é validada na API
        builder.HasIndex(x => new { x.MEM_ASSINANTE_ID, x.MEM_INSTAGRAM });
    }
}
