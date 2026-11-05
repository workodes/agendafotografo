using FluentValidation;

namespace AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;

public static class EmailPolicy
{
    public static IRuleBuilderOptions<T, string> EmailObrigatorio<T>(this IRuleBuilder<T, string> rule)
        => rule.NotEmpty().WithMessage("E-mail é obrigatório")
               .EmailAddress().WithMessage("E-mail inválido")
               .MaximumLength(256).WithMessage("E-mail deve ter no máximo 256 caracteres");
}
