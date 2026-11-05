using AgendaFotografo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AgendaFotografo.Infra.Data.Interceptors;

public class AuditableEntitiesInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        Auditar(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        Auditar(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private static void Auditar(DbContext? context)
    {
        if (context is null) return;

        var agora = DateTime.Now;
        foreach (var entry in context.ChangeTracker.Entries<IBaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                // Preserva CreatedAt já preenchido (ex.: data de cadastro legada do cliente)
                if (entry.Entity.CreatedAt is null || entry.Entity.CreatedAt == default(DateTime))
                    entry.Entity.CreatedAt = agora;
            }
            else if (entry.State == EntityState.Modified)
            {
                // Preserva o CreatedAt original
                entry.Property(x => x.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = agora;
            }
        }
    }
}
