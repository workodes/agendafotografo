using AgendaFotografo.Domain.Enums;

namespace AgendaFotografo.WebApi.Models.Eventos;

/// <summary>Visão do dia: eventos da data, membros livres e conflitos.</summary>
public class DiaResponse
{
    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly Data { get; set; }

    /// <summary>Todos os eventos da data, inclusive os cancelados, por hora ("a confirmar" por último), nome e Id.</summary>
    public List<DiaEventoItem> Eventos { get; set; } = [];

    /// <summary>Membros ativos sem escala em nenhum evento não cancelado do dia, por função e nome.</summary>
    public List<DiaMembroLivreItem> Livres { get; set; } = [];

    /// <summary>Membros escalados em 2 ou mais eventos não cancelados do dia, com os eventos lado a lado.</summary>
    public List<DiaConflitoItem> Conflitos { get; set; } = [];
}

public class DiaEventoItem
{
    public Guid Id { get; set; }
    public string EVE_NOME { get; set; } = string.Empty;
    public Guid EVE_TIPO_EVENTO_ID { get; set; }
    public string TipoEventoNome { get; set; } = string.Empty;
    public TimeOnly? EVE_HORA { get; set; }
    public string EVE_CIDADE { get; set; } = string.Empty;
    public string? EVE_LOCAL { get; set; }
    public StatusEvento EVE_STATUS { get; set; }
    public Guid? EVE_ORGANIZADOR_ID { get; set; }
    public string? OrganizadorNome { get; set; }

    /// <summary>Escala do evento, por nome do membro.</summary>
    public List<DiaEquipeItem> Equipe { get; set; } = [];

    /// <summary>Pendências em A fazer ou Em andamento (0 se o evento é Cancelado).</summary>
    public int PendenciasAbertas { get; set; }

    /// <summary>Pendências que não estão Ignoradas, todas as categorias (0 se o evento é Cancelado). Feitas = Total - Abertas.</summary>
    public int PendenciasTotal { get; set; }
}

public class DiaEquipeItem
{
    /// <summary>Id da linha da escala.</summary>
    public Guid Id { get; set; }
    public Guid EVM_MEMBRO_ID { get; set; }
    public string? EVM_POSICAO { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public bool MEM_ATIVO { get; set; }

    /// <summary>Verdadeiro quando o membro está em 2 ou mais eventos não cancelados do dia e este evento não é cancelado.</summary>
    public bool EmConflito { get; set; }
}

public class DiaMembroLivreItem
{
    /// <summary>Id do membro.</summary>
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
}

public class DiaConflitoItem
{
    /// <summary>Id do membro.</summary>
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public bool MEM_ATIVO { get; set; }

    /// <summary>Os eventos não cancelados do dia em que o membro está escalado (2 ou mais).</summary>
    public List<EventoResumo> Eventos { get; set; } = [];
}
