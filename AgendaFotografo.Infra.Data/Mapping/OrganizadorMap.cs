using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class OrganizadorMap : BaseMap<Organizador>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Organizador> builder)
    {
        builder.ToTable("ORGANIZADORES");

        builder.Property(x => x.ORG_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.ORG_NOME).IsRequired().HasMaxLength(200);
        builder.Property(x => x.ORG_CONTATO).HasMaxLength(150);
        builder.Property(x => x.ORG_EMAIL).HasMaxLength(200);
        builder.Property(x => x.ORG_TELEFONE).HasMaxLength(20);
        builder.Property(x => x.ORG_INSTAGRAM).HasMaxLength(100);
        builder.Property(x => x.ORG_NOTAS).HasMaxLength(2000);
        builder.Property(x => x.ORG_ATIVO).IsRequired();

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.ORG_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Não único: a duplicidade de nome por assinante é validada na API
        builder.HasIndex(x => new { x.ORG_ASSINANTE_ID, x.ORG_NOME });
    }
}
