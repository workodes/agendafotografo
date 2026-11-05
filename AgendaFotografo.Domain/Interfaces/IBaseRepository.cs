using System.Linq.Expressions;

namespace AgendaFotografo.Domain.Interfaces;

public interface IBaseRepository<TEntity> where TEntity : class, IBaseEntity
{
    // Métodos com save automático
    Task<TEntity> InsertAsync(TEntity entity, CancellationToken cancellationToken = default);
    /// <summary>
    /// ATENÇÃO: marca TODAS as colunas da entidade como modificadas (Update genérico). Em entidade com colunas
    /// alimentadas por outros fluxos (ex.: horas consumidas) sobrescreve valores mais novos. Prefira carregar a entidade
    /// rastreada, alterar só as propriedades editáveis e chamar SaveChangesAsync, sem Update*.
    /// </summary>
    Task<TEntity> UpdateAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<TEntity> SaveAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task InsertRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
    /// <summary>ATENÇÃO: mesmo risco de <see cref="UpdateAsync"/> (todas as colunas são marcadas como modificadas).</summary>
    Task UpdateRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
    Task DeleteRangeAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);
    Task SaveRangeAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);

    // Métodos de transação (não persistem; use IUnitOfWork.SaveChangesAsync)
    Task InsertTransactionAsync(TEntity entity, CancellationToken cancellationToken = default);
    /// <summary>
    /// ATENÇÃO: marca TODAS as colunas da entidade como modificadas (Update genérico). Não use em entidade rastreada com
    /// colunas alimentadas por outros fluxos: altere só as propriedades editáveis e chame IUnitOfWork.SaveChangesAsync.
    /// </summary>
    Task UpdateTransactionAsync(TEntity entity, CancellationToken cancellationToken = default);
    Task DeleteTransactionAsync(Guid id, CancellationToken cancellationToken = default);
    Task InsertRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
    /// <summary>ATENÇÃO: mesmo risco de <see cref="UpdateTransactionAsync"/> (todas as colunas são marcadas como modificadas).</summary>
    Task UpdateRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);
    Task DeleteRangeTransactionAsync(IEnumerable<Guid> ids, CancellationToken cancellationToken = default);
    Task SaveRangeTransactionAsync(IEnumerable<TEntity> entities, CancellationToken cancellationToken = default);

    // Consultas
    IQueryable<TEntity> SelectContext();
    IQueryable<TEntity> SelectByCondition(Expression<Func<TEntity, bool>> expression);
    Task<TEntity?> SelectAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IList<TEntity>> SelectAsync(CancellationToken cancellationToken = default, params Expression<Func<TEntity, object>>[] includes);
    Task<bool> AnyAsync(Expression<Func<TEntity, bool>> expression, CancellationToken cancellationToken = default);
}
