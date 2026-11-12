using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Assinantes;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Assinante;

/// <summary>Validação do formato da ficha. A duplicidade de e-mail e de CPF/CNPJ é checada no controller (consulta ao banco).</summary>
public class AssinanteValidator : AbstractValidator<AssinanteModel>
{
    public AssinanteValidator()
    {
        RuleFor(x => x.ASS_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.ASS_EMAIL).EmailObrigatorio()
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres");

        RuleFor(x => x.ASS_CPF_CNPJ!).CpfOuCnpjValido()
            .When(x => !string.IsNullOrWhiteSpace(x.ASS_CPF_CNPJ));

        RuleFor(x => x.ASS_TELEFONE!).TelefoneValido()
            .When(x => !string.IsNullOrWhiteSpace(x.ASS_TELEFONE));

        RuleFor(x => x.ASS_TESTE_ATE!.Value)
            .Must(d => d.Year is >= 2000 and <= 2100).WithMessage("Data do teste grátis inválida.")
            .When(x => x.ASS_TESTE_ATE.HasValue);
    }
}
