using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Models.Eventos;

namespace AgendaFotografo.WebApi.Models.Dashboard;

/// <summary>Resposta de <c>GET api/Dashboard/Resumo</c>: números do mês atual comparados com o mês anterior inteiro.</summary>
public class DashboardResumoResponse
{
    /// <summary>"yyyy-MM-dd".</summary>
    public DateOnly Hoje { get; set; }
    public DateOnly MesDe { get; set; }
    public DateOnly MesAte { get; set; }
    public DateOnly MesAnteriorDe { get; set; }
    public DateOnly MesAnteriorAte { get; set; }

    public DashboardStatusContagem Mes { get; set; } = new();
    public DashboardStatusContagem MesAnterior { get; set; } = new();

    /// <summary>Eventos não cancelados do mês por tipo (até 6 e o resto em "Outros").</summary>
    public DashboardDistribuicao PorTipo { get; set; } = new();

    /// <summary>Eventos não cancelados do mês por cidade (os 5 primeiros e o resto em "Outros").</summary>
    public DashboardDistribuicao PorCidade { get; set; } = new();

    /// <summary>Eventos não cancelados do mês por organizador (os 5 primeiros e o resto em "Outros"); não inclui os sem organizador.</summary>
    public DashboardDistribuicao PorOrganizador { get; set; } = new();

    /// <summary>Eventos não cancelados do mês sem organizador.</summary>
    public int SemOrganizador { get; set; }

    /// <summary>Até 5 membros mais escalados no mês (eventos não cancelados, inclusive Realizados), inclusive inativos.</summary>
    public List<DashboardMembroItem> MaisEscalados { get; set; } = [];

    public DashboardSemEquipe SemEquipe { get; set; } = new();
    public DashboardLivresHoje LivresHoje { get; set; } = new();
}

public class DashboardStatusContagem
{
    public int Pendentes { get; set; }
    public int Confirmados { get; set; }
    public int Realizados { get; set; }
    public int Cancelados { get; set; }

    /// <summary>Pendentes + Confirmados + Realizados.</summary>
    public int NaoCancelados { get; set; }
}

public class DashboardDistribuicao
{
    public List<DashboardDistribuicaoItem> Itens { get; set; } = [];

    /// <summary>Quantidade dos itens que ficaram fora da lista.</summary>
    public int Outros { get; set; }

    /// <summary>Soma dos itens + <see cref="Outros"/>.</summary>
    public int Total { get; set; }
}

public class DashboardDistribuicaoItem
{
    /// <summary>Id do tipo ou do organizador; nulo nas cidades.</summary>
    public Guid? Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public int Quantidade { get; set; }
}

public class DashboardMembroItem
{
    /// <summary>Id do membro.</summary>
    public Guid Id { get; set; }
    public string MEM_NOME { get; set; } = string.Empty;
    public string? MEM_INSTAGRAM { get; set; }
    public FuncaoMembro MEM_FUNCAO { get; set; }
    public bool MEM_ATIVO { get; set; }

    /// <summary>Eventos do mês em que o membro está escalado.</summary>
    public int Quantidade { get; set; }
}

public class DashboardSemEquipe
{
    /// <summary>Janela olhada a partir de hoje (30).</summary>
    public int Dias { get; set; }

    /// <summary>Total real de eventos Pendentes ou Confirmados sem ninguém escalado.</summary>
    public int Quantidade { get; set; }

    /// <summary>Até 5 eventos, do mais próximo para o mais distante.</summary>
    public List<EventoResumo> Eventos { get; set; } = [];
}

public class DashboardLivresHoje
{
    /// <summary>Total de livres hoje (membros ativos sem evento não cancelado hoje).</summary>
    public int Quantidade { get; set; }
    public int TotalAtivos { get; set; }

    /// <summary>Até 12 membros livres.</summary>
    public List<DiaMembroLivreItem> Membros { get; set; } = [];
}
