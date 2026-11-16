using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Auth;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Auth;

internal static class CodigoRegras
{
    public const string MsgFormato = "Digite o código de 6 números.";

    /// <summary>Código fora do formato é recusado aqui, sem gastar tentativa.</summary>
    public static void Codigo<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).Must(c => c is { Length: 6 } && c.All(ch => ch is >= '0' and <= '9')).WithMessage(MsgFormato);
}

public class ConfirmarEmailValidator : AbstractValidator<ConfirmarEmailModel>
{
    public ConfirmarEmailValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail é obrigatório");
        RuleFor(x => x.Senha).NotEmpty().WithMessage("Senha é obrigatória");
        CodigoRegras.Codigo(this, x => x.Codigo);
    }
}

public class ReenviarCodigoValidator : AbstractValidator<ReenviarCodigoModel>
{
    public ReenviarCodigoValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail é obrigatório");
        RuleFor(x => x.Senha).NotEmpty().WithMessage("Senha é obrigatória");
    }
}

public class CorrigirEmailValidator : AbstractValidator<CorrigirEmailModel>
{
    public CorrigirEmailValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail é obrigatório");
        RuleFor(x => x.Senha).NotEmpty().WithMessage("Senha é obrigatória");
        RuleFor(x => x.EmailNovo).EmailObrigatorio()
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres");
    }
}

public class EsqueciSenhaValidator : AbstractValidator<EsqueciSenhaModel>
{
    public EsqueciSenhaValidator()
    {
        RuleFor(x => x.Email).Cascade(CascadeMode.Stop)
            .NotEmpty().WithMessage("Informe um e-mail válido.")
            .EmailAddress().WithMessage("Informe um e-mail válido.")
            .MaximumLength(256).WithMessage("Informe um e-mail válido.");
    }
}

public class RedefinirSenhaValidator : AbstractValidator<RedefinirSenhaModel>
{
    public RedefinirSenhaValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail é obrigatório");
        CodigoRegras.Codigo(this, x => x.Codigo);
        RuleFor(x => x.NovaSenha).SenhaMinima8();
    }
}

public class DefinirSenhaValidator : AbstractValidator<DefinirSenhaModel>
{
    public DefinirSenhaValidator()
    {
        CodigoRegras.Codigo(this, x => x.Codigo);
        RuleFor(x => x.NovaSenha).SenhaMinima8();
    }
}
