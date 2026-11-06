using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>
/// Único ponto do cálculo de conflito da escala. Regras: o conflito é o mesmo membro em 2 ou mais eventos na mesma DATA
/// (a hora é ignorada); eventos Cancelados não contam, Realizados contam. O conflito é calculado na leitura, nunca gravado,
/// e nunca bloqueia nada. Toda consulta filtra pelo assinante recebido (que vem de <c>AssinanteEscopo</c>).
/// </summary>
public class EscalaConsultas(
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    IBaseRepository<Membro> repMembro)
{
    private readonly IBaseRepository<Evento> _repEvento = repEvento;
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly IBaseRepository<Membro> _repMembro = repMembro;

    /// <summary>
    /// Outros eventos não cancelados da data em que cada membro está escalado, sem contar o evento informado
    /// (<paramref name="eventoIdIgnorado"/>). Ordenados por hora ("a confirmar" por último), nome e Id.
    /// </summary>
    public async Task<ILookup<Guid, EventoResumo>> OutrosEventosAsync(Guid assinanteId, DateOnly data, Guid? eventoIdIgnorado,
        IReadOnlyCollection<Guid> membroIds, CancellationToken cancellationToken)
    {
        if (membroIds.Count == 0) return Enumerable.Empty<EventoResumo>().ToLookup(x => x.Id);

        var linhas = await _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId &&
                        membroIds.Contains(x.EVM_MEMBRO_ID) &&
                        x.Evento!.EVE_DATA == data &&
                        x.Evento.EVE_STATUS != StatusEvento.Cancelado &&
                        (eventoIdIgnorado == null || x.EVM_EVENTO_ID != eventoIdIgnorado))
            .OrderBy(x => x.Evento!.EVE_HORA == null).ThenBy(x => x.Evento!.EVE_HORA)
            .ThenBy(x => x.Evento!.EVE_NOME).ThenBy(x => x.EVM_EVENTO_ID)
            .Select(x => new
            {
                x.EVM_MEMBRO_ID,
                Resumo = new EventoResumo
                {
                    Id = x.EVM_EVENTO_ID,
                    EVE_NOME = x.Evento!.EVE_NOME,
                    EVE_DATA = x.Evento.EVE_DATA,
                    EVE_HORA = x.Evento.EVE_HORA,
                    EVE_CIDADE = x.Evento.EVE_CIDADE,
                    EVE_LOCAL = x.Evento.EVE_LOCAL,
                    EVE_STATUS = x.Evento.EVE_STATUS
                }
            })
            .ToListAsync(cancellationToken);

        return linhas.ToLookup(x => x.EVM_MEMBRO_ID, x => x.Resumo);
    }

    /// <summary>
    /// Conflitos no período (datas inclusivas): membros escalados em 2 ou mais eventos não cancelados na mesma data (a hora é ignorada,
    /// mesma regra do conflito da escala). Um item por membro e dia, ordenado por data, nome do membro e Id; os eventos de cada item
    /// vêm por hora ("a confirmar" por último), nome e Id.
    /// </summary>
    public async Task<List<ConflitoPeriodo>> ConflitosNoPeriodoAsync(Guid assinanteId, DateOnly de, DateOnly ate, CancellationToken cancellationToken)
    {
        var linhas = await _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId &&
                        x.Evento!.EVE_DATA >= de && x.Evento.EVE_DATA <= ate &&
                        x.Evento.EVE_STATUS != StatusEvento.Cancelado)
            .Select(x => new
            {
                x.EVM_MEMBRO_ID,
                MembroNome = x.Membro!.MEM_NOME,
                Resumo = new EventoResumo
                {
                    Id = x.EVM_EVENTO_ID,
                    EVE_NOME = x.Evento!.EVE_NOME,
                    EVE_DATA = x.Evento.EVE_DATA,
                    EVE_HORA = x.Evento.EVE_HORA,
                    EVE_CIDADE = x.Evento.EVE_CIDADE,
                    EVE_LOCAL = x.Evento.EVE_LOCAL,
                    EVE_STATUS = x.Evento.EVE_STATUS
                }
            })
            .ToListAsync(cancellationToken);

        return linhas
            .GroupBy(x => (x.EVM_MEMBRO_ID, x.Resumo.EVE_DATA))
            .Select(g => new
            {
                g.Key.EVM_MEMBRO_ID,
                g.Key.EVE_DATA,
                MembroNome = g.First().MembroNome,
                Eventos = g.Select(x => x.Resumo).DistinctBy(e => e.Id)
                    .OrderBy(e => e.EVE_HORA == null).ThenBy(e => e.EVE_HORA).ThenBy(e => e.EVE_NOME).ThenBy(e => e.Id)
                    .ToList()
            })
            .Where(x => x.Eventos.Count >= 2)
            .OrderBy(x => x.EVE_DATA).ThenBy(x => x.MembroNome).ThenBy(x => x.EVM_MEMBRO_ID)
            .Select(x => new ConflitoPeriodo(x.EVM_MEMBRO_ID, x.MembroNome, x.EVE_DATA, x.Eventos))
            .ToList();
    }

    /// <summary>
    /// Escala do evento (por nome do membro), com os outros eventos da data de cada membro. Com <paramref name="escalaId"/>
    /// devolve só essa linha. Se o próprio evento está Cancelado, <c>OutrosEventos</c> vem vazio (não há conflito).
    /// </summary>
    public async Task<List<EventoMembroItem>> ListarEscalaAsync(Guid assinanteId, Guid eventoId, DateOnly data,
        StatusEvento statusEvento, Guid? escalaId, CancellationToken cancellationToken)
    {
        var query = _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId && x.EVM_EVENTO_ID == eventoId);
        if (escalaId is not null) query = query.Where(x => x.Id == escalaId);

        var itens = await query
            .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.Id)
            .Select(x => new EventoMembroItem
            {
                Id = x.Id,
                EVM_EVENTO_ID = x.EVM_EVENTO_ID,
                EVM_MEMBRO_ID = x.EVM_MEMBRO_ID,
                EVM_POSICAO = x.EVM_POSICAO,
                MEM_NOME = x.Membro!.MEM_NOME,
                MEM_INSTAGRAM = x.Membro.MEM_INSTAGRAM,
                MEM_FUNCAO = x.Membro.MEM_FUNCAO,
                MEM_ATIVO = x.Membro.MEM_ATIVO
            })
            .ToListAsync(cancellationToken);

        // Evento cancelado não gera conflito para quem está nele
        if (statusEvento == StatusEvento.Cancelado) return itens;

        var outros = await OutrosEventosAsync(assinanteId, data, eventoId,
            itens.Select(x => x.EVM_MEMBRO_ID).Distinct().ToList(), cancellationToken);
        foreach (var item in itens) item.OutrosEventos = outros[item.EVM_MEMBRO_ID].ToList();

        return itens;
    }

    /// <summary>
    /// Membros ativos que ainda não estão na escala do evento, com os outros eventos da data de cada um. Se o próprio evento
    /// está Cancelado, <c>OutrosEventos</c> vem vazio (não há conflito).
    /// </summary>
    public async Task<List<OpcaoEscalaItem>> ListarOpcoesAsync(Guid assinanteId, Guid eventoId, DateOnly data,
        StatusEvento statusEvento, CancellationToken cancellationToken)
    {
        var jaEscalados = _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId && x.EVM_EVENTO_ID == eventoId)
            .Select(x => x.EVM_MEMBRO_ID);

        var itens = await _repMembro.SelectContext().AsNoTracking()
            .Where(x => x.MEM_ASSINANTE_ID == assinanteId && x.MEM_ATIVO && !jaEscalados.Contains(x.Id))
            .OrderBy(x => x.MEM_NOME).ThenBy(x => x.Id)
            .Select(x => new OpcaoEscalaItem
            {
                Id = x.Id,
                MEM_NOME = x.MEM_NOME,
                MEM_INSTAGRAM = x.MEM_INSTAGRAM,
                MEM_FUNCAO = x.MEM_FUNCAO
            })
            .ToListAsync(cancellationToken);

        if (statusEvento == StatusEvento.Cancelado) return itens;

        var outros = await OutrosEventosAsync(assinanteId, data, eventoId,
            itens.Select(x => x.Id).ToList(), cancellationToken);
        foreach (var item in itens) item.OutrosEventos = outros[item.Id].ToList();

        return itens;
    }

    /// <summary>Visão do dia: todos os eventos da data (inclusive cancelados), membros livres e conflitos.</summary>
    public async Task<DiaResponse> ObterDiaAsync(Guid assinanteId, DateOnly data, CancellationToken cancellationToken)
    {
        var eventos = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId && x.EVE_DATA == data)
            .OrderBy(x => x.EVE_HORA == null).ThenBy(x => x.EVE_HORA).ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id)
            .Select(x => new DiaEventoItem
            {
                Id = x.Id,
                EVE_NOME = x.EVE_NOME,
                EVE_TIPO_EVENTO_ID = x.EVE_TIPO_EVENTO_ID,
                TipoEventoNome = x.TipoEvento!.TPE_NOME,
                EVE_HORA = x.EVE_HORA,
                EVE_CIDADE = x.EVE_CIDADE,
                EVE_LOCAL = x.EVE_LOCAL,
                EVE_STATUS = x.EVE_STATUS,
                EVE_ORGANIZADOR_ID = x.EVE_ORGANIZADOR_ID,
                OrganizadorNome = x.Organizador != null ? x.Organizador.ORG_NOME : null
            })
            .ToListAsync(cancellationToken);

        var eventoIds = eventos.Select(x => x.Id).ToList();

        var escala = eventoIds.Count == 0
            ? []
            : await _repEventoMembro.SelectContext().AsNoTracking()
                .Where(x => x.EVM_ASSINANTE_ID == assinanteId && eventoIds.Contains(x.EVM_EVENTO_ID))
                .OrderBy(x => x.Membro!.MEM_NOME).ThenBy(x => x.Id)
                .Select(x => new
                {
                    x.Id,
                    x.EVM_EVENTO_ID,
                    x.EVM_MEMBRO_ID,
                    x.EVM_POSICAO,
                    x.Membro!.MEM_NOME,
                    x.Membro.MEM_INSTAGRAM,
                    x.Membro.MEM_FUNCAO,
                    x.Membro.MEM_ATIVO
                })
                .ToListAsync(cancellationToken);

        // Só eventos não cancelados entram no cálculo de conflito e de livres
        var canceladas = eventos.Where(e => e.EVE_STATUS == StatusEvento.Cancelado).Select(e => e.Id).ToHashSet();
        var ativas = escala.Where(x => !canceladas.Contains(x.EVM_EVENTO_ID)).ToList();

        var membrosEmConflito = ativas
            .GroupBy(x => x.EVM_MEMBRO_ID)
            .Where(g => g.Select(x => x.EVM_EVENTO_ID).Distinct().Count() >= 2)
            .Select(g => g.Key)
            .ToHashSet();

        foreach (var evento in eventos)
        {
            var cancelado = canceladas.Contains(evento.Id);
            evento.Equipe = escala
                .Where(x => x.EVM_EVENTO_ID == evento.Id)
                .Select(x => new DiaEquipeItem
                {
                    Id = x.Id,
                    EVM_MEMBRO_ID = x.EVM_MEMBRO_ID,
                    EVM_POSICAO = x.EVM_POSICAO,
                    MEM_NOME = x.MEM_NOME,
                    MEM_INSTAGRAM = x.MEM_INSTAGRAM,
                    MEM_FUNCAO = x.MEM_FUNCAO,
                    MEM_ATIVO = x.MEM_ATIVO,
                    EmConflito = !cancelado && membrosEmConflito.Contains(x.EVM_MEMBRO_ID)
                })
                .ToList();
        }

        var resumoPorEvento = eventos.ToDictionary(e => e.Id, e => new EventoResumo
        {
            Id = e.Id,
            EVE_NOME = e.EVE_NOME,
            EVE_DATA = data,
            EVE_HORA = e.EVE_HORA,
            EVE_CIDADE = e.EVE_CIDADE,
            EVE_LOCAL = e.EVE_LOCAL,
            EVE_STATUS = e.EVE_STATUS
        });
        var ordemEvento = eventos.Select((e, i) => (e.Id, i)).ToDictionary(x => x.Id, x => x.i);

        var conflitos = ativas
            .Where(x => membrosEmConflito.Contains(x.EVM_MEMBRO_ID))
            .GroupBy(x => x.EVM_MEMBRO_ID)
            .Select(g =>
            {
                var primeiro = g.First();
                return new DiaConflitoItem
                {
                    Id = g.Key,
                    MEM_NOME = primeiro.MEM_NOME,
                    MEM_INSTAGRAM = primeiro.MEM_INSTAGRAM,
                    MEM_FUNCAO = primeiro.MEM_FUNCAO,
                    MEM_ATIVO = primeiro.MEM_ATIVO,
                    Eventos = g.Select(x => x.EVM_EVENTO_ID).Distinct()
                        .OrderBy(id => ordemEvento[id])
                        .Select(id => resumoPorEvento[id]).ToList()
                };
            })
            .OrderBy(x => x.MEM_NOME).ThenBy(x => x.Id)
            .ToList();

        var ocupados = ativas.Select(x => x.EVM_MEMBRO_ID).Distinct().ToList();
        var livres = await _repMembro.SelectContext().AsNoTracking()
            .Where(x => x.MEM_ASSINANTE_ID == assinanteId && x.MEM_ATIVO && !ocupados.Contains(x.Id))
            .OrderBy(x => x.MEM_FUNCAO).ThenBy(x => x.MEM_NOME).ThenBy(x => x.Id)
            .Select(x => new DiaMembroLivreItem
            {
                Id = x.Id,
                MEM_NOME = x.MEM_NOME,
                MEM_INSTAGRAM = x.MEM_INSTAGRAM,
                MEM_FUNCAO = x.MEM_FUNCAO
            })
            .ToListAsync(cancellationToken);

        return new DiaResponse { Data = data, Eventos = eventos, Livres = livres, Conflitos = conflitos };
    }
}

/// <summary>Membro com 2 ou mais eventos não cancelados na mesma data.</summary>
public sealed record ConflitoPeriodo(Guid MembroId, string MembroNome, DateOnly Data, List<EventoResumo> Eventos);
