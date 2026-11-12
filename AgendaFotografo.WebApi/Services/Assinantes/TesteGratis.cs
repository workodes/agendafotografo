namespace AgendaFotografo.WebApi.Services.Assinantes;

/// <summary>
/// Ponto único da regra do teste grátis. A data "teste até" não tem hora e vale até o fim do dia; o dia do cadastro conta como o 1º dia.
/// "Hoje" é sempre passado por quem chama (<c>DateOnly.FromDateTime(DateTime.Now)</c>; o Dockerfile fixa TZ=America/Sao_Paulo).
/// Nesta entrega o prazo vencido não bloqueia nada.
/// </summary>
public static class TesteGratis
{
    public const int DiasGratisPadrao = 15;

    /// <summary>Lê <c>Teste:DiasGratis</c>; ausente, inválido ou menor que 1 vale <see cref="DiasGratisPadrao"/>.</summary>
    public static int ObterDiasGratis(IConfiguration configuration)
        => int.TryParse(configuration["Teste:DiasGratis"], out var dias) && dias >= 1 ? dias : DiasGratisPadrao;

    /// <summary>Último dia do teste: hoje + (dias - 1).</summary>
    public static DateOnly CalcularTesteAte(DateOnly hoje, int dias) => hoje.AddDays(dias - 1);

    /// <summary>Nulo = sem prazo; senão (teste até - hoje) + 1, nunca menor que 0 (0 = teste encerrado).</summary>
    public static int? DiasRestantes(DateOnly? testeAte, DateOnly hoje)
        => testeAte is null ? null : Math.Max(0, testeAte.Value.DayNumber - hoje.DayNumber + 1);
}
