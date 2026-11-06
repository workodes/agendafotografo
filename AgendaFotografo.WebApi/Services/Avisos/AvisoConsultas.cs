using AgendaFotografo.Domain.Entities;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.Domain.Interfaces;
using AgendaFotografo.WebApi.Models.Avisos;
using AgendaFotografo.WebApi.Models.Eventos;
using AgendaFotografo.WebApi.Services.Eventos;
using Microsoft.EntityFrameworkCore;

namespace AgendaFotografo.WebApi.Services.Avisos;

/// <summary>
/// Fonte única dos avisos do assinante (sino do cabeçalho, tela Início e o e-mail diário de lembretes do módulo 12).
/// Tudo é calculado na hora a partir dos dados existentes: sem tabela, sem "lido/não lido". A API devolve texto pronto em pt-BR
/// e o tipo; a rota de destino é montada no SPA. Toda consulta filtra pelo assinante recebido (que vem de <c>AssinanteEscopo</c>)
/// e o "hoje" também é parâmetro. Nunca lê nem expõe notas internas, observações ou dados do organizador.
/// </summary>
public class AvisoConsultas(
    IBaseRepository<Evento> repEvento,
    IBaseRepository<EventoMembro> repEventoMembro,
    IBaseRepository<EventoArquivo> repEventoArquivo,
    PendenciaConsultas pendenciaConsultas,
    EscalaConsultas escalaConsultas)
{
    /// <summary>Janela à frente (em dias, contando hoje) para eventos próximos e conflitos.</summary>
    public const int DiasAFrente = 7;

    /// <summary>Eventos de hoje até hoje + este valor também contam as pendências abertas como problema.</summary>
    public const int DiasEventoChegando = 3;

    /// <summary>Janela para trás (em dias, antes de hoje) dos eventos passados sem baixa.</summary>
    public const int DiasPassado = 30;

    /// <summary>Máximo de itens devolvidos (o <c>Total</c> informa o real).</summary>
    public const int LimiteItens = 30;

    /// <summary>Hoje e amanhã deixam o aviso de evento e de conflito Crítico.</summary>
    private const int DiasCritico = 1;

    private const int NomesNaDescricao = 3;

    private static readonly string[] DiasSemana = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

    private readonly IBaseRepository<Evento> _repEvento = repEvento;
    private readonly IBaseRepository<EventoMembro> _repEventoMembro = repEventoMembro;
    private readonly IBaseRepository<EventoArquivo> _repEventoArquivo = repEventoArquivo;
    private readonly PendenciaConsultas _pendenciaConsultas = pendenciaConsultas;
    private readonly EscalaConsultas _escalaConsultas = escalaConsultas;

    /// <summary>Monta os cinco tipos de aviso. Ordem: gravidade, data do evento (sem data primeiro), título; no máximo <see cref="LimiteItens"/> itens.</summary>
    public async Task<AvisosResponse> ListarAsync(Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var avisos = new List<AvisoItem>();

        await AdicionarPendenciasAsync(avisos, assinanteId, hoje, cancellationToken);
        await AdicionarEventosProximosAsync(avisos, assinanteId, hoje, cancellationToken);
        await AdicionarConflitosAsync(avisos, assinanteId, hoje, cancellationToken);
        await AdicionarPassadosSemBaixaAsync(avisos, assinanteId, hoje, cancellationToken);

        var ordenados = avisos
            .OrderBy(x => x.Gravidade)
            .ThenBy(x => x.Data ?? DateOnly.MinValue)
            .ThenBy(x => x.Titulo, StringComparer.CurrentCultureIgnoreCase)
            .ThenBy(x => x.Chave, StringComparer.Ordinal)
            .ToList();

        return new AvisosResponse
        {
            Total = ordenados.Count,
            Criticos = ordenados.Count(x => x.Gravidade == GravidadeAviso.Critico),
            Itens = ordenados.Take(LimiteItens).ToList()
        };
    }

    // ===== Pendências vencidas e vencendo =====

    private async Task AdicionarPendenciasAsync(List<AvisoItem> avisos, Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var resumo = await _pendenciaConsultas.ResumoPrazoAsync(assinanteId, hoje, cancellationToken);

        if (resumo.Vencidas > 0)
            avisos.Add(new AvisoItem
            {
                Chave = "pendencias-vencidas",
                Tipo = TipoAviso.PendenciasVencidas,
                Gravidade = GravidadeAviso.Critico,
                Titulo = resumo.Vencidas == 1 ? "1 pendência vencida" : $"{resumo.Vencidas} pendências vencidas",
                Descricao = ListaComResto(resumo.TitulosVencidas, resumo.Vencidas),
                Quantidade = resumo.Vencidas
            });

        if (resumo.Vencendo > 0)
            avisos.Add(new AvisoItem
            {
                Chave = "pendencias-vencendo",
                Tipo = TipoAviso.PendenciasVencendo,
                Gravidade = GravidadeAviso.Atencao,
                Titulo = resumo.Vencendo == 1 ? "1 pendência vencendo" : $"{resumo.Vencendo} pendências vencendo",
                Descricao = ListaComResto(resumo.TitulosVencendo, resumo.Vencendo),
                Quantidade = resumo.Vencendo
            });
    }

    // ===== Eventos próximos com problema =====

    private async Task AdicionarEventosProximosAsync(List<AvisoItem> avisos, Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var ate = hoje.AddDays(DiasAFrente);

        // Só os campos necessários: notas internas, informações, observações e organizador nunca são lidos
        var eventos = await _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId && x.EVE_DATA >= hoje && x.EVE_DATA <= ate &&
                        x.EVE_STATUS != StatusEvento.Cancelado)
            .Select(x => new
            {
                x.Id,
                x.EVE_NOME,
                x.EVE_DATA,
                x.EVE_HORA,
                x.EVE_STATUS,
                x.EVE_LARGADA_LOCAL,
                x.EVE_LARGADA_LINK,
                x.EVE_ROTA_LINK_MAPS,
                x.EVE_ROTA_LINK_STRAVA
            })
            .ToListAsync(cancellationToken);

        if (eventos.Count == 0) return;

        var ids = eventos.Select(x => x.Id).ToList();
        var chegando = eventos.Where(x => x.EVE_DATA <= hoje.AddDays(DiasEventoChegando)).Select(x => x.Id).ToList();

        // Equipe, arquivos de rota e pendências de todos os eventos da janela de uma vez (sem N+1)
        var comEquipe = (await _repEventoMembro.SelectContext().AsNoTracking()
            .Where(x => x.EVM_ASSINANTE_ID == assinanteId && ids.Contains(x.EVM_EVENTO_ID))
            .Select(x => x.EVM_EVENTO_ID)
            .Distinct()
            .ToListAsync(cancellationToken)).ToHashSet();

        var comArquivoRota = (await _repEventoArquivo.SelectContext().AsNoTracking()
            .Where(x => x.EVA_ASSINANTE_ID == assinanteId && ids.Contains(x.EVA_EVENTO_ID) &&
                        (x.EVA_TIPO == TipoArquivoEvento.ImagemRota || x.EVA_TIPO == TipoArquivoEvento.Gpx))
            .Select(x => x.EVA_EVENTO_ID)
            .Distinct()
            .ToListAsync(cancellationToken)).ToHashSet();

        var abertas = await _pendenciaConsultas.AbertasPorEventoAsync(assinanteId, chegando, cancellationToken);

        foreach (var e in eventos)
        {
            var problemas = new List<string>();

            if (e.EVE_STATUS == StatusEvento.Pendente)
                problemas.Add("Ainda não confirmado");
            else if (e.EVE_STATUS == StatusEvento.Confirmado)
            {
                if (!comEquipe.Contains(e.Id)) problemas.Add("Sem equipe");

                var semRota = string.IsNullOrWhiteSpace(e.EVE_ROTA_LINK_MAPS) && string.IsNullOrWhiteSpace(e.EVE_ROTA_LINK_STRAVA) &&
                              !comArquivoRota.Contains(e.Id);
                if (semRota) problemas.Add("Sem rota");

                if (e.EVE_HORA is null) problemas.Add("Sem hora");

                if (string.IsNullOrWhiteSpace(e.EVE_LARGADA_LOCAL) && string.IsNullOrWhiteSpace(e.EVE_LARGADA_LINK))
                    problemas.Add("Sem local de largada");
            }

            if (abertas.TryGetValue(e.Id, out var qtd) && qtd > 0)
                problemas.Add(qtd == 1 ? "1 pendência aberta" : $"{qtd} pendências abertas");

            if (problemas.Count == 0) continue;

            avisos.Add(new AvisoItem
            {
                Chave = $"evento-proximo:{e.Id}",
                Tipo = TipoAviso.EventoProximo,
                Gravidade = EhCritico(e.EVE_DATA, hoje) ? GravidadeAviso.Critico : GravidadeAviso.Atencao,
                Titulo = $"{e.EVE_NOME} ({DataCurta(e.EVE_DATA)})",
                Descricao = JuntarProblemas(problemas),
                Detalhes = problemas,
                EventoId = e.Id,
                Data = e.EVE_DATA
            });
        }
    }

    // ===== Conflitos de escala =====

    private async Task AdicionarConflitosAsync(List<AvisoItem> avisos, Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var conflitos = await _escalaConsultas.ConflitosNoPeriodoAsync(assinanteId, hoje, hoje.AddDays(DiasAFrente), cancellationToken);

        foreach (var c in conflitos)
        {
            avisos.Add(new AvisoItem
            {
                Chave = $"conflito:{c.MembroId}:{c.Data:yyyy-MM-dd}",
                Tipo = TipoAviso.ConflitoEscala,
                Gravidade = EhCritico(c.Data, hoje) ? GravidadeAviso.Critico : GravidadeAviso.Atencao,
                Titulo = $"{c.MembroNome} em {c.Eventos.Count} eventos ({DataCurta(c.Data)})",
                Descricao = string.Join(", ", c.Eventos.Select(x => x.EVE_NOME)),
                Detalhes = c.Eventos.Select(x => x.EVE_HORA is null
                    ? $"{x.EVE_NOME} (hora a confirmar)"
                    : $"{x.EVE_NOME} ({x.EVE_HORA.Value:HH\\:mm})").ToList(),
                Quantidade = c.Eventos.Count,
                Data = c.Data,
                MembroId = c.MembroId
            });
        }
    }

    // ===== Eventos passados sem baixa =====

    private async Task AdicionarPassadosSemBaixaAsync(List<AvisoItem> avisos, Guid assinanteId, DateOnly hoje, CancellationToken cancellationToken)
    {
        var query = _repEvento.SelectContext().AsNoTracking()
            .Where(x => x.EVE_ASSINANTE_ID == assinanteId &&
                        x.EVE_DATA < hoje && x.EVE_DATA >= hoje.AddDays(-DiasPassado) &&
                        (x.EVE_STATUS == StatusEvento.Pendente || x.EVE_STATUS == StatusEvento.Confirmado));

        var total = await query.CountAsync(cancellationToken);
        if (total == 0) return;

        // Do mais antigo para o mais novo: o primeiro dá a data do aviso (o SPA abre a Agenda nesse mês)
        var primeiros = await query
            .OrderBy(x => x.EVE_DATA).ThenBy(x => x.EVE_NOME).ThenBy(x => x.Id)
            .Select(x => new { x.EVE_NOME, x.EVE_DATA })
            .Take(NomesNaDescricao)
            .ToListAsync(cancellationToken);

        avisos.Add(new AvisoItem
        {
            Chave = "eventos-passados-sem-baixa",
            Tipo = TipoAviso.EventosPassadosSemBaixa,
            Gravidade = GravidadeAviso.Atencao,
            Titulo = total == 1 ? "1 evento passado sem baixa" : $"{total} eventos passados sem baixa",
            Descricao = ListaComResto(primeiros.Select(x => $"{x.EVE_NOME} ({DataCurta(x.EVE_DATA)})").ToList(), total),
            Detalhes = ["Marque como Realizado ou Cancelado."],
            Quantidade = total,
            Data = primeiros[0].EVE_DATA
        });
    }

    // ===== Textos =====

    private static bool EhCritico(DateOnly data, DateOnly hoje) => data <= hoje.AddDays(DiasCritico);

    /// <summary>"sáb 14/11".</summary>
    private static string DataCurta(DateOnly data) => $"{DiasSemana[(int)data.DayOfWeek]} {data:dd/MM}";

    /// <summary>"Sem equipe, sem rota, 2 pendências abertas": só a primeira letra fica maiúscula.</summary>
    private static string JuntarProblemas(List<string> problemas) =>
        string.Join(", ", problemas.Select((p, i) => i == 0 || p.Length == 0 ? p : char.ToLowerInvariant(p[0]) + p[1..]));

    /// <summary>"A, B, C" ou "A, B, C e mais 2" quando o total passa dos nomes mostrados.</summary>
    private static string ListaComResto(List<string> nomes, int total)
    {
        var texto = string.Join(", ", nomes);
        var resto = total - nomes.Count;
        return resto > 0 ? $"{texto} e mais {resto}" : texto;
    }
}
