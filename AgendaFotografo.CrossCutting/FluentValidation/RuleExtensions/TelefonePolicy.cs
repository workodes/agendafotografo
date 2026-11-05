using System.Text.RegularExpressions;
using FluentValidation;

namespace AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;

public static class TelefonePolicy
{
    public static IRuleBuilderOptions<T, string> TelefoneValido<T>(this IRuleBuilder<T, string> rule)
        => rule.Must(v =>
        {
            var d = Regex.Replace(v ?? string.Empty, @"\D", "");
            return d.Length is 10 or 11;
        }).WithMessage("Telefone inválido (informe DDD + número)");
}
