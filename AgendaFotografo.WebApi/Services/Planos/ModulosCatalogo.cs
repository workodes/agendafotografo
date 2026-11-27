using System.ComponentModel;
using System.Reflection;
using AgendaFotografo.Domain.Constants;
using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Models.Planos;

namespace AgendaFotografo.WebApi.Services.Planos;

/// <summary>
/// Catálogo dos módulos (plano 24), montado a partir do enum <see cref="ModuloPlano"/>: um módulo novo no enum aparece sozinho na tela de
/// planos. Nome = <c>[Description]</c> do enum (ou o nome do membro); a descrição do cartão vem de <see cref="Descricoes"/> (vazia se faltar).
/// </summary>
public static class ModulosCatalogo
{
    private static readonly IReadOnlyDictionary<ModuloPlano, string> Descricoes = new Dictionary<ModuloPlano, string>
    {
        [ModuloPlano.Inicio] = "Painel do Início com os números do mês, a equipe mais escalada e os próximos eventos.",
        [ModuloPlano.VisaoSemana] = "Visão da semana e do dia, com a equipe escalada, os conflitos e quem está livre.",
        [ModuloPlano.LinkPublico] = "Link do evento protegido por código, para a equipe ver os detalhes sem entrar no sistema.",
        [ModuloPlano.Avisos] = "Sino de avisos no cabeçalho: pendências vencidas, eventos próximos com problema e conflitos de escala.",
        [ModuloPlano.Assistente] = "Assistente com IA para lançar eventos por texto ou flyer e consultar a agenda.",
        [ModuloPlano.Financeiro] = "Carteira do coordenador: receitas, despesas, gastos fixos e gráficos."
    };

    /// <summary>Todos os módulos do enum, na ordem dos valores.</summary>
    public static IReadOnlyList<ModuloPlano> Todos { get; } = [.. Enum.GetValues<ModuloPlano>().OrderBy(m => (int)m)];

    public static bool Existe(ModuloPlano modulo) => Enum.IsDefined(modulo);

    /// <summary>Nome na tela (atributo <c>[Description]</c> do enum).</summary>
    public static string Nome(ModuloPlano modulo)
    {
        var membro = typeof(ModuloPlano).GetField(modulo.ToString());
        return membro?.GetCustomAttribute<DescriptionAttribute>()?.Description ?? modulo.ToString();
    }

    public static string Descricao(ModuloPlano modulo) => Descricoes.TryGetValue(modulo, out var texto) ? texto : string.Empty;

    /// <summary>Texto do 403 da API para um módulo não liberado.</summary>
    public static string MensagemBloqueio(ModuloPlano modulo) => $"{Nome(modulo)} não está disponível no seu plano.";

    public static ModulosCatalogoResponse Montar() => new()
    {
        Liberaveis = [.. Todos.Select(m => new ModuloCatalogoItem { Modulo = m, Nome = Nome(m), Descricao = Descricao(m) })],
        SempreLiberados = [.. PlanosPadrao.ModulosBase]
    };
}
