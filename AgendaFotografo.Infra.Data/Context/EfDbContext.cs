using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Infra.Data.Mapping;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.Infra.Data.Context;

public class EfDbContext(DbContextOptions<EfDbContext> options) : IdentityDbContext<Usuario>(options)
{
    public DbSet<Assinante> Assinantes => Set<Assinante>();
    public DbSet<Evento> Eventos => Set<Evento>();
    public DbSet<EventoArquivo> EventoArquivos => Set<EventoArquivo>();
    public DbSet<EventoMembro> EventoMembros => Set<EventoMembro>();
    public DbSet<Membro> Membros => Set<Membro>();
    public DbSet<Organizador> Organizadores => Set<Organizador>();
    public DbSet<TipoEvento> TiposEvento => Set<TipoEvento>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tabelas do Identity em maiúsculas, como as demais tabelas do projeto
        modelBuilder.Entity<Usuario>().ToTable("ASPNETUSERS");
        modelBuilder.Entity<IdentityRole>().ToTable("ASPNETROLES");
        modelBuilder.Entity<IdentityRoleClaim<string>>().ToTable("ASPNETROLECLAIMS");
        modelBuilder.Entity<IdentityUserClaim<string>>().ToTable("ASPNETUSERCLAIMS");
        modelBuilder.Entity<IdentityUserLogin<string>>().ToTable("ASPNETUSERLOGINS");
        modelBuilder.Entity<IdentityUserRole<string>>().ToTable("ASPNETUSERROLES");
        modelBuilder.Entity<IdentityUserToken<string>>().ToTable("ASPNETUSERTOKENS");

        // Vínculo do usuário com perfil Assinante (FK opcional, Restrict, índice)
        modelBuilder.Entity<Usuario>(b =>
        {
            b.HasOne(x => x.Assinante)
                .WithMany()
                .HasForeignKey(x => x.AssinanteId)
                .OnDelete(DeleteBehavior.Restrict);
            b.HasIndex(x => x.AssinanteId);
        });

        modelBuilder.ApplyConfiguration(new AssinanteMap());
        modelBuilder.ApplyConfiguration(new EventoMap());
        modelBuilder.ApplyConfiguration(new EventoArquivoMap());
        modelBuilder.ApplyConfiguration(new EventoMembroMap());
        modelBuilder.ApplyConfiguration(new MembroMap());
        modelBuilder.ApplyConfiguration(new OrganizadorMap());
        modelBuilder.ApplyConfiguration(new TipoEventoMap());
    }
}
