using AgendaFotografo.WebApi.Models;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Auth;

public class LoginValidator : AbstractValidator<LoginModel>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail é obrigatório");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Senha é obrigatória");
    }
}
