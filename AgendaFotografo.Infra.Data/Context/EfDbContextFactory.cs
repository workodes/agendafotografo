using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace AgendaFotografo.Infra.Data.Context;

/// <summary>
/// Usada SOMENTE pelas ferramentas do EF (<c>dotnet ef migrations add</c>). Não é usada pela API em runtime
/// (a API usa o <c>Setup</c>, com <c>ServerVersion.AutoDetect</c> e a connection string real).
/// Versão do MySQL fixa e connection string fictícia (sem servidor real e sem senha): gerar migration não acessa o banco.
/// </summary>
public class EfDbContextFactory : IDesignTimeDbContextFactory<EfDbContext>
{
    public EfDbContext CreateDbContext(string[] args)
    {
        const string connectionStringFicticia = "Server=localhost;Database=design_time_only";

        var options = new DbContextOptionsBuilder<EfDbContext>()
            .UseMySql(connectionStringFicticia, new MySqlServerVersion(new Version(8, 0, 36)),
                b => b.MigrationsAssembly(typeof(EfDbContext).Assembly.FullName))
            .Options;

        return new EfDbContext(options);
    }
}
