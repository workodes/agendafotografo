using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class PlanoMap : BaseMap<Plano>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Plano> builder)
    {
        builder.ToTable("PLANOS");

        builder.Property(x => x.PLA_NOME).IsRequired().HasMaxLength(100);
        builder.Property(x => x.PLA_VALOR).IsRequired().HasColumnType("decimal(12,2)");
        builder.Property(x => x.PLA_RECORRENCIA).IsRequired().HasConversion<int>();
        builder.Property(x => x.PLA_ATIVO).IsRequired();
        builder.Property(x => x.PLA_MOSTRAR_LANDING).IsRequired();
        builder.Property(x => x.PLA_DESCRICAO).HasMaxLength(300);
        builder.Property(x => x.PLA_ORDEM).IsRequired();
        builder.Property(x => x.PLA_DESTAQUE).IsRequired();

        // Não único no banco: a unicidade sem diferenciar maiúsculas é checada na API
        builder.HasIndex(x => x.PLA_NOME);
    }
}
