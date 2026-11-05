using System.Text.RegularExpressions;
using FluentValidation;

namespace AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;

public static class EnderecoRules
{
    public static IRuleBuilderOptions<T, string> CepValido<T>(this IRuleBuilder<T, string> rule)
        => rule.Must(v => Regex.Replace(v ?? string.Empty, @"\D", "").Length == 8).WithMessage("CEP inválido");

    public static IRuleBuilderOptions<T, string> UfValida<T>(this IRuleBuilder<T, string> rule)
        => rule.Length(2).WithMessage("UF deve ter 2 caracteres");
}
