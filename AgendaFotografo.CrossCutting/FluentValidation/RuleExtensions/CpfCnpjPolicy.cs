using System.Text.RegularExpressions;
using DocumentValidator;
using FluentValidation;

namespace AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;

public static class CpfCnpjPolicy
{
    private static string SomenteDigitos(string valor) => Regex.Replace(valor ?? string.Empty, @"\D", "");

    public static IRuleBuilderOptions<T, string> CpfValido<T>(this IRuleBuilder<T, string> rule)
        => rule.Must(v => CpfValidation.Validate(SomenteDigitos(v))).WithMessage("CPF inválido");

    public static IRuleBuilderOptions<T, string> CnpjValido<T>(this IRuleBuilder<T, string> rule)
        => rule.Must(v => CnpjValidation.Validate(SomenteDigitos(v))).WithMessage("CNPJ inválido");

    public static IRuleBuilderOptions<T, string> CpfOuCnpjValido<T>(this IRuleBuilder<T, string> rule)
        => rule.Must(v =>
        {
            var d = SomenteDigitos(v);
            return d.Length == 11 ? CpfValidation.Validate(d) : d.Length == 14 && CnpjValidation.Validate(d);
        }).WithMessage("CPF/CNPJ inválido");
}
