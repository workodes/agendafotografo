using System.Linq.Expressions;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models;
using AgendaFotografo.WebApi.Models.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>
/// Único ponto das regras de prazo das pendências (reaproveitado pelo Painel e pelo e-mail de lembretes do módulo 8).
/// Vencida = aberta (status diferente de Concluída) com prazo antes de hoje; vencendo = aberta com prazo de hoje até hoje + <see cref="DiasAVencer"/>.
/// Pendências de eventos Cancelados nunca ficam vencidas nem vencendo. Calculado na leitura, nunca gravado.
/// Toda consulta filtra pelo assinante recebido (que vem de <c>AssinanteEscopo</c>); o "hoje" também é parâmetro.
/// </summary>
public class PendenciaConsultas(IBaseRepository<EventoPendencia> repPendencia)
{
    /// <summary>Quantos dias à frente (contando hoje) uma pendência aberta é considerada "vencendo".</summary>
    public const int DiasAVencer = 3;

    private readonly IBaseRepository<EventoPendencia> _repPendencia = repPendencia;

    /// <summary>Filtro de prazo da lista geral.</summary>
    public enum FiltroPrazo { Todos, Vencidas, Vencendo, VencidasOuVencendo }

    private static readonly Expression<Func<EventoPendencia, EventoPendenciaItem>> Projecao = x => new EventoPendenciaItem
    {
        Id = x.Id,
        EVP_EVENTO_ID = x.EVP_EVENTO_ID,
        EVP_TITULO = x.EVP_TITULO,
        EVP_CATEGORIA = x.EVP_CATEGORIA,
        EVP_PRIORIDADE = x.EVP_PRIORIDADE,
        EVP_STATUS = x.EVP_STATUS,
        EVP_MEMBRO_ID = x.EVP_MEMBRO_ID,
        EVP_PRAZO = x.EVP_PRAZO,
        EVP_OBSERVACOES = x.EVP_OBSERVACOES,
        MEM_NOME = x.Membro != null ? x.Membro.MEM_NOME : null,
        MEM_ATIVO = x.Membro != null ? x.Membro.MEM_ATIVO : (bool?)null,
        EVE_NOME = x.Evento!.EVE_NOME,
        EVE_DATA = x.Evento.EVE_DATA,
        EVE_STATUS = x.Evento.EVE_STATUS
    };

    /// <summary>Regra única de Vencida/Vencendo; preenche o item.</summary>
    public static void CalcularPrazo(EventoPendenciaItem item, DateOnly hoje)
    {
        item.Vencida = false;
        item.Vencendo = false;
        if (item.EVP_PRAZO is null || item.EVP_STATUS == StatusPendencia.Concluida || item.EVE_STATUS == StatusEvento.Cancelado) return;

        var prazo = item.EVP_PRAZO.Value;
        if (prazo < hoje) item.Vencida = true;
        else if (prazo <= hoje.AddDays(DiasAVencer)) item.Vencendo = true;
    }

    private static List<EventoPendenciaItem> Preencher(List<EventoPendenciaItem> itens, DateOnly hoje)
    {
        foreach (var item in itens) CalcularPrazo(item, hoje);
        return itens;
    }

    /// <summary>
    /// Pendências do evento na ordem da ficha: abertas antes das concluídas, prazo (sem prazo por último), prioridade, título e Id.
    /// Com <paramref name="pendenciaId"/>, devolve só ela (ainda restrita ao evento e ao assinante).
    /// </summary>
    public async Task<List<EventoPendenciaItem>> ListarDoEventoAsync(Guid assinanteId, Guid eventoId, DateOnly hoje, Guid? pendenciaId, CancellationToken cancellationToken)
    {
        var query = _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.EVP_EVENTO_ID == eventoId);
        if (pendenciaId is not null) query = query.Where(x => x.Id == pendenciaId);

        var itens = await query
            .OrderBy(x => x.EVP_STATUS == StatusPendencia.Concluida)
            .ThenBy(x => x.EVP_PRAZO == null).ThenBy(x => x.EVP_PRAZO)
            .ThenBy(x => x.EVP_PRIORIDADE)
            .ThenBy(x => x.EVP_TITULO).ThenBy(x => x.Id)
            .Select(Projecao)
            .ToListAsync(cancellationToken);

        return Preencher(itens, hoje);
    }

    /// <summary>Uma pendência do assinante; nula se não existir ou for de outro assinante.</summary>
    public async Task<EventoPendenciaItem?> ObterAsync(Guid assinanteId, Guid pendenciaId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var itens = await _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.Id == pendenciaId)
            .Select(Projecao)
            .ToListAsync(cancellationToken);
        return Preencher(itens, hoje).FirstOrDefault();
    }

    /// <summary>
    /// Lista geral paginada (só eventos não cancelados). <paramref name="status"/> nulo = abertas (A fazer e Em andamento).
    /// O filtro de prazo só vale para abertas. Ordem: prazo (sem prazo por último), prioridade, data do evento, título e Id.
    /// </summary>
    public async Task<PaginatedResponse<EventoPendenciaItem>> ListarAsync(Guid assinanteId, DateOnly hoje, int page, int pageSize,
        StatusPendencia? status, bool todasAsSituacoes, PrioridadePendencia? prioridade, Guid? membroId, FiltroPrazo prazo,
        CancellationToken cancellationToken)
    {
        var query = _repPendencia.SelectContext().AsNoTracking()
            .Where(x => x.EVP_ASSINANTE_ID == assinanteId && x.Evento!.EVE_STATUS != StatusEvento.Cancelado);

        if (status is not null) query = query.Where(x => x.EVP_STATUS == status);
        else if (!todasAsSituacoes) query = query.Where(x => x.EVP_STATUS != StatusPendencia.Concluida);

        if (prioridade is not null) query = query.Where(x => x.EVP_PRIORIDADE == prioridade);
        if (membroId is not null && membroId != Guid.Empty) query = query.Where(x => x.EVP_MEMBRO_ID == membroId);

        if (prazo != FiltroPrazo.Todos)
        {
            var limite = hoje.AddDays(DiasAVencer);
            query = query.Where(x => x.EVP_STATUS != StatusPendencia.Concluida && x.EVP_PRAZO != null);
            query = prazo switch
            {
                FiltroPrazo.Vencidas => query.Where(x => x.EVP_PRAZO < hoje),
                FiltroPrazo.Vencendo => query.Where(x => x.EVP_PRAZO >= hoje && x.EVP_PRAZO <= limite),
                _ => query.Where(x => x.EVP_PRAZO <= limite)
            };
        }

        var total = await query.CountAsync(cancellationToken);

        var dados = await query
            .OrderBy(x => x.EVP_PRAZO == null).ThenBy(x => x.EVP_PRAZO)
            .ThenBy(x => x.EVP_PRIORIDADE)
            .ThenBy(x => x.Evento!.EVE_DATA)
            .ThenBy(x => x.EVP_TITULO).ThenBy(x => x.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(Projecao)
            .ToListAsync(cancellationToken);

        return new PaginatedResponse<EventoPendenciaItem>
        {
            TotalCount = total,
            Page = page,
            PageSize = pageSize,
            Data = Preencher(dados, hoje)
        };
    }
}
