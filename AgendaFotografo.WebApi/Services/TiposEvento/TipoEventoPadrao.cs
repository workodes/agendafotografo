using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Interfaces;

namespace AgendaFotografo.WebApi.Services.TiposEvento;

/// <summary>
/// Tipos de evento que todo assinante recebe ao ser criado. <see cref="CriarPadroesAsync"/> só inclui os registros no contexto
/// (<c>InsertRangeTransactionAsync</c>) e NUNCA salva nem faz commit: quem chama fecha a transação (ou chama <c>SaveChanges</c>).
/// </summary>
public class TipoEventoPadrao(IBaseRepository<TipoEvento> repTipoEvento)
{
    private readonly IBaseRepository<TipoEvento> _repTipoEvento = repTipoEvento;

    /// <summary>Nomes dos tipos padrão, na ordem de criação.</summary>
    public static readonly IReadOnlyList<string> Nomes =
        ["Corrida", "Treino", "CrossFit", "Moto passeio", "Casamento", "Academia", "Outro"];

    public Task CriarPadroesAsync(Guid assinanteId, CancellationToken cancellationToken)
    {
        var tipos = Nomes.Select(nome => new TipoEvento
        {
            TPE_ASSINANTE_ID = assinanteId,
            TPE_NOME = nome,
            TPE_ATIVO = true
        }).ToList();

        return _repTipoEvento.InsertRangeTransactionAsync(tipos, cancellationToken);
    }
}
