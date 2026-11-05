using Microsoft.EntityFrameworkCore;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore.Storage;

namespace AgendaFotografo.Infra.Data.Repository;

public class UnitOfWork(EfDbContext context) : IUnitOfWork
{
    private readonly EfDbContext _context = context;
    private IDbContextTransaction? _transaction;

    public async Task BeginTransactionAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is not null) return;
        _transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
    }

    public async Task BeginTransactionAsync(System.Data.IsolationLevel isolationLevel, CancellationToken cancellationToken = default)
    {
        if (_transaction is not null) return;
        _transaction = await _context.Database.BeginTransactionAsync(isolationLevel, cancellationToken);
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        => _context.SaveChangesAsync(cancellationToken);

    public async Task CommitAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is null) return;
        await _transaction.CommitAsync(cancellationToken);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public async Task RollbackAsync(CancellationToken cancellationToken = default)
    {
        if (_transaction is null) return;
        await _transaction.RollbackAsync(cancellationToken);
        await _transaction.DisposeAsync();
        _transaction = null;
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _transaction = null;
    }
}
