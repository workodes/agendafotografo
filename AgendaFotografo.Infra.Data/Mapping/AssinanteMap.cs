using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class AssinanteMap : BaseMap<Assinante>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Assinante> builder)
    {
        builder.ToTable("ASSINANTES");

        builder.Property(x => x.ASS_NOME).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ASS_CPF_CNPJ).HasMaxLength(18);
        builder.Property(x => x.ASS_EMAIL).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ASS_TELEFONE).HasMaxLength(20);
        builder.Property(x => x.ASS_ATIVO).IsRequired();
        builder.Property(x => x.ASS_TESTE_ATE).HasColumnType("date");
        builder.Property(x => x.ASS_ORIGEM).IsRequired();

        builder.HasIndex(x => x.ASS_NOME);
    }
}
