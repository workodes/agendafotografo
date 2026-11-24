using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Financeiro;

/// <summary>Regra única do valor em reais (Lançamento e Gasto fixo): maior que zero, até 99.999.999,99 e no máximo 2 casas decimais.</summary>
public static class ValorFinanceiroRules
{
    public const decimal ValorMaximo = 99_999_999.99m;

    public static IRuleBuilderOptions<T, decimal> ValorEmReais<T>(this IRuleBuilder<T, decimal> rule)
        => rule
            .GreaterThan(0m).WithMessage("Valor deve ser maior que zero")
            .LessThanOrEqualTo(ValorMaximo).WithMessage("Valor deve ser no máximo 99.999.999,99")
            .Must(v => decimal.Round(v, 2) == v).WithMessage("Valor deve ter no máximo 2 casas decimais");
}
