using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Cadastros;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Organizador;

/// <summary>Validação do formato da ficha (já normalizada). A duplicidade de e-mail e telefone é checada no controller (consulta ao banco).</summary>
public class OrganizadorValidator : AbstractValidator<OrganizadorModel>
{
    public OrganizadorValidator()
    {
        RuleFor(x => x.ORG_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.ORG_CONTATO!).MaximumLength(150).WithMessage("Contato deve ter no máximo 150 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.ORG_CONTATO));

        RuleFor(x => x.ORG_EMAIL!).EmailAddress().WithMessage("E-mail inválido")
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.ORG_EMAIL));

        RuleFor(x => x.ORG_TELEFONE!).TelefoneValido()
            .When(x => !string.IsNullOrWhiteSpace(x.ORG_TELEFONE));

        RuleFor(x => x.ORG_INSTAGRAM!).MaximumLength(100).WithMessage("Instagram deve ter no máximo 100 caracteres")
            .Matches("^[A-Za-z0-9._]+$").WithMessage("Instagram deve ter apenas letras, números, ponto e sublinhado")
            .When(x => !string.IsNullOrWhiteSpace(x.ORG_INSTAGRAM));

        RuleFor(x => x.ORG_NOTAS!).MaximumLength(2000).WithMessage("Notas devem ter no máximo 2000 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.ORG_NOTAS));
    }
}
