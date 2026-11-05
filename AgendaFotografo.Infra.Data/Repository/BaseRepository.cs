using System.Linq.Expressions;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.Infra.Data.Context;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.Infra.Data.Repository;

public class BaseRepository<TEntity>(EfDbContext context) : IBaseRepository<TEntity> where TEntity : class, IBaseEntity
{
    protected readonly EfDbContext _context = context;

    private async Task<TEntity> ObterOuFalharAsync(Guid id, CancellationToken ct)
        => await _context.Set<TEntity>().FirstOrDefaultAsync(x => x.Id == id, ct)
           ?? throw new Exception("Registro não encontrado");

    // ---- Save automático ----
    public async Task<TEntity> InsertAsync(TEntity entity, CancellationToken ct = default)
    {
        await _context.Set<TEntity>().AddAsync(entity, ct);
        await _context.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<TEntity> UpdateAsync(TEntity entity, CancellationToken ct = default)
    {
        _context.Set<TEntity>().Update(entity);
        await _context.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await ObterOuFalharAsync(id, ct);
        _context.Set<TEntity>().Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task<TEntity> SaveAsync(TEntity entity, CancellationToken ct = default)
        => entity.Id == Guid.Empty ? await InsertAsync(entity, ct) : await UpdateAsync(entity, ct);

    public async Task InsertRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
    {
        await _context.Set<TEntity>().AddRangeAsync(entities, ct);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdateRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
    {
        _context.Set<TEntity>().UpdateRange(entities);
        await _context.SaveChangesAsync(ct);
    }

    public async Task DeleteRangeAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var lista = ids.ToList();
        var entities = await _context.Set<TEntity>().Where(x => lista.Contains(x.Id)).ToListAsync(ct);
        _context.Set<TEntity>().RemoveRange(entities);
        await _context.SaveChangesAsync(ct);
    }

    public async Task SaveRangeAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
    {
        await SaveRangeTransactionAsync(entities, ct);
        await _context.SaveChangesAsync(ct);
    }

    // ---- Transação (sem save) ----
    public async Task InsertTransactionAsync(TEntity entity, CancellationToken ct = default)
        => await _context.Set<TEntity>().AddAsync(entity, ct);

    public Task UpdateTransactionAsync(TEntity entity, CancellationToken ct = default)
    {
        _context.Set<TEntity>().Update(entity);
        return Task.CompletedTask;
    }

    public async Task DeleteTransactionAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await ObterOuFalharAsync(id, ct);
        _context.Set<TEntity>().Remove(entity);
    }

    public async Task InsertRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
        => await _context.Set<TEntity>().AddRangeAsync(entities, ct);

    public Task UpdateRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
    {
        _context.Set<TEntity>().UpdateRange(entities);
        return Task.CompletedTask;
    }

    public async Task DeleteRangeTransactionAsync(IEnumerable<Guid> ids, CancellationToken ct = default)
    {
        var lista = ids.ToList();
        var entities = await _context.Set<TEntity>().Where(x => lista.Contains(x.Id)).ToListAsync(ct);
        _context.Set<TEntity>().RemoveRange(entities);
    }

    public async Task SaveRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken ct = default)
    {
        var lista = entities.ToList();
        await _context.Set<TEntity>().AddRangeAsync(lista.Where(x => x.Id == Guid.Empty), ct);
        _context.Set<TEntity>().UpdateRange(lista.Where(x => x.Id != Guid.Empty));
    }

    // ---- Consultas ----
    public IQueryable<TEntity> SelectContext() => _context.Set<TEntity>();

    public IQueryable<TEntity> SelectByCondition(Expression<Func<TEntity, bool>> expression)
        => _context.Set<TEntity>().Where(expression);

    public async Task<TEntity?> SelectAsync(Guid id, CancellationToken ct = default)
        => await _context.Set<TEntity>().FirstOrDefaultAsync(x => x.Id == id, ct);

    public async Task<IList<TEntity>> SelectAsync(CancellationToken ct = default, params Expression<Func<TEntity, object>>[] includes)
    {
        IQueryable<TEntity> query = _context.Set<TEntity>();
        foreach (var include in includes) query = query.Include(include);
        return await query.ToListAsync(ct);
    }

    public async Task<bool> AnyAsync(Expression<Func<TEntity, bool>> expression, CancellationToken ct = default)
        => await _context.Set<TEntity>().AnyAsync(expression, ct);
}
