using FluentValidation;

namespace AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;

public static class PasswordPolicy
{
    /// <summary>Única regra de senha do sistema: mínimo de 8 caracteres.</summary>
    public static IRuleBuilderOptions<T, string> SenhaMinima8<T>(this IRuleBuilder<T, string> rule)
        => rule.NotEmpty().WithMessage("Senha é obrigatória")
               .MinimumLength(8).WithMessage("A senha deve ter no mínimo 8 caracteres");
}
