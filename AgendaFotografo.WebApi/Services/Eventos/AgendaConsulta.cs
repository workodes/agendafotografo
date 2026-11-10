using System.Linq.Expressions;
using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>Filtro da consulta de eventos. Tudo é opcional; o assinante é sempre parâmetro explícito dos métodos (vindo do <c>AssinanteEscopo</c>).</summary>
public class AgendaFiltro
{
    public DateOnly? De { get; set; }
    public DateOnly? Ate { get; set; }
    public StatusEvento? Status { get; set; }
    public Guid? TipoEventoId { get; set; }

    /// <summary>Igualdade (a collation do banco ignora maiúsculas e acento).</summary>
    public string? Cidade { get; set; }

    /// <summary>Eventos em que o membro está na escala.</summary>
    public Guid? MembroId { get; set; }

    /// <summary>Palavras: cada uma precisa aparecer no nome, na cidade, no local ou no nome do tipo.</summary>
    public IReadOnlyList<string>? Palavras { get; set; }
}

/// <summary>
/// Consulta de eventos do assinante, única para o <c>EventoController</c> (Agenda, Listar e Dia) e para o assistente (<c>BuscarEventos</c>).
/// Contém a projeção <see cref="EventoListItem"/>, o carregamento da equipe e o preenchimento do progresso de pendências.
/// </summary>
public class AgendaConsulta(
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    PendenciaConsultas pendenciaConsultas)
{
    /// <summary>Projeção comum de Evento para EventoListItem (sem a equipe, preenchida por <see cref="CarregarEquipeAsync"/>).</summary>
    public static readonly Expression<Func<Evento, EventoListItem>> ProjecaoListItem = x => new EventoListItem
    {
        Id = x.Id,
        EVE_NOME = x.EVE_NOME,
        EVE_TIPO_EVENTO_ID = x.EVE_TIPO_EVENTO_ID,
        TipoEventoNome = x.TipoEvento!.TPE_NOME,
        EVE_DATA = x.EVE_DATA,
        EVE_HORA = x.EVE_HORA,
        EVE_CIDADE = x.EVE_CIDADE,
        EVE_LOCAL = x.EVE_LOCAL,
        EVE_STATUS = x.EVE_STATUS,
        EVE_ORGANIZADOR_ID = x.EVE_ORGANIZADOR_ID,
        OrganizadorNome = x.Organizador != null ? x.Organizador.ORG_NOME : null
    };

    /// <summary>Query dos eventos do assinante com o filtro aplicado, sem ordem. Só leitura (<c>AsNoTracking</c>).</summary>
    public IQueryable<Evento> Consultar(Guid assinanteId, AgendaFiltro filtro)
    {
        var query = repEvento.SelectContext().AsNoTracking().Where(x => x.EVE_ASSINANTE_ID == assinanteId);

        if (filtro.De is { } de) query = query.Where(x => x.EVE_DATA >= de);
        if (filtro.Ate is { } ate) query = query.Where(x => x.EVE_DATA <= ate);
        if (filtro.Status is { } st) query = query.Where(x => x.EVE_STATUS == st);

        if (filtro.TipoEventoId is { } tipo && tipo != Guid.Empty)
            query = query.Where(x => x.EVE_TIPO_EVENTO_ID == tipo);

        var cidade = (filtro.Cidade ?? string.Empty).Trim();
        if (cidade.Length > 0) query = query.Where(x => x.EVE_CIDADE == cidade);

        if (filtro.MembroId is { } membro && membro != Guid.Empty)
        {
            var escala = repEventoMembro.SelectContext().AsNoTracking()
                .Where(m => m.EVM_ASSINANTE_ID == assinanteId && m.EVM_MEMBRO_ID == membro);
            query = query.Where(x => escala.Any(m => m.EVM_EVENTO_ID == x.Id));
        }

        foreach (var palavra in filtro.Palavras ?? [])
        {
            var p = palavra;
            query = query.Where(x => x.EVE_NOME.Contains(p) || x.EVE_CIDADE.Contains(p) ||
                                     (x.EVE_LOCAL != null && x.EVE_LOCAL.Contains(p)) || x.TipoEvento!.TPE_NOME.Contains(p));
        }

        return query;
    }

    /// <summary>Ordem da Agenda: data, hora (os "a confirmar" por último), nome e Id.</summary>
    public static IOrderedQueryable<Evento> OrdenarAgenda(IQueryable<Evento> query) =>
        query.OrderBy(x => x.EVE_DATA).ThenBy(x => x.EVE_HORA == null).ThenBy(x => x.EVE_HORA).ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id);

    /// <summary>Eventos do filtro, na ordem da Agenda, com equipe e progresso de pendências.</summary>
    public async Task<List<EventoListItem>> ListarAsync(Guid assinanteId, AgendaFiltro filtro, CancellationToken cancellationToken)
    {
        var dados = await OrdenarAgenda(Consultar(assinanteId, filtro))
            .Select(ProjecaoListItem)
            .ToListAsync(cancellationToken);

        await CarregarEquipeAsync(dados, assinanteId, cancellationToken);
        await PreencherPendenciasAsync(dados, assinanteId, cancellationToken);
        return dados;
    }

    /// <summary>Preenche a Equipe dos itens com uma consulta em EVENTOXMEMBRO (do assinante), ordenada pelo nome do membro.</summary>
    public async Task CarregarEquipeAsync(List<EventoListItem> dados, Guid assinanteId, CancellationToken cancellationToken)
    {
        if (dados.Count == 0) return;

        var ids = dados.Select(x => x.Id).ToList();
        var escala = await repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId && ids.Contains(x.EVM_EVENTO_ID))
            .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.EVM_MEMBRO_ID)
            .Select(x => new
            {
                x.EVM_EVENTO_ID,
                Membro = new EventoEquipeItem
                {
                    Id = x.EVM_MEMBRO_ID,
                    MEM_NOME = x.Membro!.MEM_NOME,
                    MEM_INSTAGRAM = x.Membro.MEM_INSTAGRAM
                }
            })
            .ToListAsync(cancellationToken);

        var porEvento = escala.ToLookup(x => x.EVM_EVENTO_ID, x => x.Membro);
        foreach (var item in dados) item.Equipe = porEvento[item.Id].ToList();
    }

    /// <summary>Preenche <c>PendenciasAbertas</c>/<c>PendenciasTotal</c> com uma chamada agrupada (sem N+1); sem entrada no dicionário = 0 e 0.</summary>
    public async Task PreencherPendenciasAsync<T>(List<T> itens, Func<T, Guid> id, Action<T, int, int> atribuir, Guid assinanteId,
        CancellationToken cancellationToken)
    {
        if (itens.Count == 0) return;

        var contagem = await pendenciaConsultas.ContarPorEventoAsync(assinanteId, itens.Select(id).ToList(), cancellationToken);
        foreach (var item in itens)
        {
            var (abertas, total) = contagem.GetValueOrDefault(id(item));
            atribuir(item, abertas, total);
        }
    }

    public Task PreencherPendenciasAsync(List<EventoListItem> itens, Guid assinanteId, CancellationToken cancellationToken) =>
        PreencherPendenciasAsync(itens, x => x.Id, (x, a, t) => { x.PendenciasAbertas = a; x.PendenciasTotal = t; }, assinanteId, cancellationToken);
}
