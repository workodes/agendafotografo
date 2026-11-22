using System.Globalization;

namespace AgendaFotografo.WebApi.Services.Eventos;

/// <summary>
/// Validação única do período das agendas (<c>Evento/Agenda</c> e <c>EventoPessoal/Agenda</c>): as duas datas são obrigatórias
/// ("yyyy-MM-dd", inclusivas), a inicial não passa da final e o período tem no máximo 62 dias (contando os dois extremos).
/// Lança <see cref="Exception"/> com a mensagem em pt-BR.
/// </summary>
public static class PeriodoAgenda
{
    public const int DiasMaximos = 62;

    public static (DateOnly De, DateOnly Ate) Validar(string? dataDe, string? dataAte)
    {
        if (string.IsNullOrWhiteSpace(dataDe) || string.IsNullOrWhiteSpace(dataAte))
            throw new Exception("Informe o período");

        var de = Parse(dataDe, "Data inicial inválida");
        var ate = Parse(dataAte, "Data final inválida");
        if (de > ate) throw new Exception("A data inicial não pode ser maior que a data final");
        if (ate.DayNumber - de.DayNumber + 1 > DiasMaximos) throw new Exception("O período não pode passar de 62 dias");
        return (de, ate);
    }

    private static DateOnly Parse(string texto, string mensagemErro)
    {
        if (!DateOnly.TryParseExact(texto.Trim(), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var data))
            throw new Exception(mensagemErro);
        return data;
    }
}
