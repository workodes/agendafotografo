using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Auth;

public class AlterarSenhaValidator : AbstractValidator<AlterarSenhaModel>
{
    public AlterarSenhaValidator()
    {
        RuleFor(x => x.SenhaAtual).NotEmpty().WithMessage("Senha atual é obrigatória");
        RuleFor(x => x.NovaSenha).SenhaMinima8();
        RuleFor(x => x.NovaSenha)
            .Must((m, nova) => nova != m.SenhaAtual)
            .WithMessage("A nova senha deve ser diferente da senha atual")
            .When(x => !string.IsNullOrEmpty(x.NovaSenha) && !string.IsNullOrEmpty(x.SenhaAtual));
    }
}
