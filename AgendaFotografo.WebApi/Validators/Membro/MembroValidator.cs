using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Cadastros;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Membro;

/// <summary>Validação do formato da ficha (já normalizada). A duplicidade de @instagram é checada no controller (consulta ao banco).</summary>
public class MembroValidator : AbstractValidator<MembroModel>
{
    public MembroValidator()
    {
        RuleFor(x => x.MEM_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.MEM_FUNCAO).Cascade(CascadeMode.Stop)
            .NotEqual(default(Domain.Enums.FuncaoMembro)).WithMessage("Função é obrigatória")
            .IsInEnum().WithMessage("Função inválida");

        RuleFor(x => x.MEM_EMAIL!).EmailAddress().WithMessage("E-mail inválido")
            .MaximumLength(150).WithMessage("E-mail deve ter no máximo 150 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.MEM_EMAIL));

        RuleFor(x => x.MEM_TELEFONE!).TelefoneValido()
            .When(x => !string.IsNullOrWhiteSpace(x.MEM_TELEFONE));

        RuleFor(x => x.MEM_INSTAGRAM!)
            .MaximumLength(100).WithMessage("Instagram deve ter no máximo 100 caracteres")
            .Matches("^[A-Za-z0-9._]+$").WithMessage("Instagram deve ter apenas letras, números, ponto e sublinhado")
            .When(x => !string.IsNullOrWhiteSpace(x.MEM_INSTAGRAM));

        RuleFor(x => x.MEM_OBSERVACOES!).MaximumLength(2000).WithMessage("Observações devem ter no máximo 2000 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.MEM_OBSERVACOES));
    }
}
