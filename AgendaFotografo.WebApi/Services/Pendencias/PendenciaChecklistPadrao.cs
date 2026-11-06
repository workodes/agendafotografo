using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Pendencias;

/// <summary>
/// Checklist padrão de pendências do assinante. A lista nasce VAZIA (sem semente): o assinante cadastra os próprios modelos.
/// <see cref="AplicarAsync"/> cria as pendências de um evento a partir dos modelos ativos.
/// Só INCLUI no contexto (<c>*TransactionAsync</c>): nunca salva nem faz commit, quem chama fecha a transação.
/// Reaproveitado pela recorrência (módulo 11): cada ocorrência gerada chama <see cref="AplicarAsync"/> com a data da ocorrência.
/// </summary>
public class PendenciaChecklistPadrao(IBaseRepository<PendenciaModelo> repModelo, IBaseRepository<EventoPendencia> repPendencia)
{
    private readonly IBaseRepository<PendenciaModelo> _repModelo = repModelo;
    private readonly IBaseRepository<EventoPendencia> _repPendencia = repPendencia;

    private static readonly DateOnly PrazoMaximo = new(2100, 12, 31);

    /// <summary>
    /// Inclui no contexto uma pendência (A fazer, sem responsável) para cada modelo ativo do tipo do evento ou de "todos os tipos".
    /// Prazo = data do evento menos os dias do modelo; se ficar antes de <paramref name="hoje"/> (ou fora de 2000-2100), a pendência nasce sem prazo.
    /// Com <paramref name="ignorarModelosJaAplicados"/>, modelos que já têm pendência no evento (inclusive ignorada) não voltam.
    /// O evento precisa já estar salvo. Devolve a quantidade incluída.
    /// </summary>
    public async Task<int> AplicarAsync(Guid assinanteId, Evento evento, DateOnly hoje, bool ignorarModelosJaAplicados, CancellationToken cancellationToken)
    {
        var tipoId = evento.EVE_TIPO_EVENTO_ID;

        var modelos = await _repModelo.SelectContext().AsNoTracking()
            .Where(x => x.PEM_ASSINANTE_ID == assinanteId && x.PEM_ATIVO &&
                        (x.PEM_TIPO_EVENTO_ID == null || x.PEM_TIPO_EVENTO_ID == tipoId))
            .OrderByDescending(x => x.PEM_DIAS_ANTES).ThenBy(x => x.PEM_TITULO).ThenBy(x => x.Id)
            .ToListAsync(cancellationToken);

        if (ignorarModelosJaAplicados && modelos.Count > 0)
        {
            var aplicados = await _repPendencia.SelectContext().AsNoTracking()
                .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.EVP_EVENTO_ID == evento.Id && x.EVP_MODELO_ID != null)
                .Select(x => x.EVP_MODELO_ID!.Value)
                .ToListAsync(cancellationToken);
            var jaAplicados = aplicados.ToHashSet();
            modelos = modelos.Where(m => !jaAplicados.Contains(m.Id)).ToList();
        }

        if (modelos.Count == 0) return 0;

        var pendencias = modelos.Select(m => new EventoPendencia
        {
            EVP_ASSINANTE_ID = assinanteId,
            EVP_EVENTO_ID = evento.Id,
            EVP_TITULO = m.PEM_TITULO,
            EVP_CATEGORIA = m.PEM_CATEGORIA,
            EVP_PRIORIDADE = m.PEM_PRIORIDADE,
            EVP_STATUS = StatusPendencia.AFazer,
            EVP_MEMBRO_ID = null,
            EVP_PRAZO = CalcularPrazo(evento.EVE_DATA, m.PEM_DIAS_ANTES, hoje),
            EVP_OBSERVACOES = null,
            EVP_MODELO_ID = m.Id
        }).ToList();

        await _repPendencia.InsertRangeTransactionAsync(pendencias, cancellationToken);
        return pendencias.Count;
    }

    /// <summary>Prazo relativo à data do evento; nulo se não houver prazo no modelo ou se a data calculada já passou.</summary>
    public static DateOnly? CalcularPrazo(DateOnly dataEvento, int? diasAntes, DateOnly hoje)
    {
        if (diasAntes is null) return null;
        var prazo = dataEvento.AddDays(-diasAntes.Value);
        if (prazo < hoje || prazo > PrazoMaximo) return null;
        return prazo;
    }
}
