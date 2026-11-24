using AgendaFotografo.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AgendaFotografo.Infra.Data.Mapping;

public class LancamentoMap : BaseMap<Lancamento>
{
    protected override void ConfigureEntity(EntityTypeBuilder<Lancamento> builder)
    {
        builder.ToTable("LANCAMENTOS");

        builder.Property(x => x.LAN_ASSINANTE_ID).IsRequired();
        builder.Property(x => x.LAN_TIPO).IsRequired().HasConversion<int>();
        builder.Property(x => x.LAN_TITULO).IsRequired().HasMaxLength(200);
        builder.Property(x => x.LAN_VALOR).IsRequired().HasColumnType("decimal(12,2)");
        builder.Property(x => x.LAN_DATA).IsRequired().HasColumnType("date");
        builder.Property(x => x.LAN_CATEGORIA).IsRequired().HasConversion<int>();
        builder.Property(x => x.LAN_OBSERVACOES).HasMaxLength(2000);
        builder.Property(x => x.LAN_REFERENCIA).HasColumnType("date");

        builder.HasOne(x => x.Assinante)
            .WithMany()
            .HasForeignKey(x => x.LAN_ASSINANTE_ID)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.GastoFixo)
            .WithMany()
            .HasForeignKey(x => x.LAN_GASTO_FIXO_ID)
            .OnDelete(DeleteBehavior.Restrict);

        // Lista, cartões e gráficos: lançamentos do assinante por período
        builder.HasIndex(x => new { x.LAN_ASSINANTE_ID, x.LAN_DATA });

        // Um mês só uma vez por gasto fixo (vários NULL são aceitos: lançamentos manuais e desvinculados não são afetados).
        // Barra a geração duplicada em corrida e atende a FK do gasto fixo (prefixo do índice).
        builder.HasIndex(x => new { x.LAN_GASTO_FIXO_ID, x.LAN_REFERENCIA }).IsUnique();
    }
}
