using FluentValidation;

namespace AgendaFotografo.WebApi.Helpers;

public static class ValidationHelper
{
    public static string? ValidateModel<T>(T model, IValidator<T> validator)
    {
        var result = validator.Validate(model);
        if (result.IsValid) return null;
        return string.Join("\n", result.Errors.Select(e => e.ErrorMessage).Distinct());
    }
}
