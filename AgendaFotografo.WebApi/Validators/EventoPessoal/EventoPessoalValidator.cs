using AgendaFotografo.Domain.Enums;
using AgendaFotografo.WebApi.Models.Fotografo;
using AgendaFotografo.WebApi.Validators.Evento;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.EventoPessoal;

/// <summary>Validação do formato do evento pessoal (já normalizado). Mesmas regras de data e link do <c>EventoValidator</c>.</summary>
public class EventoPessoalValidator : AbstractValidator<EventoPessoalModel>
{
    public EventoPessoalValidator()
    {
        RuleFor(x => x.EPS_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

        RuleFor(x => x.EPS_DATA).Cascade(CascadeMode.Stop)
            .Must(d => d != default).WithMessage("Data é obrigatória")
            .Must(d => d.Year >= 2000 && d.Year <= 2100).WithMessage("Data deve estar entre os anos 2000 e 2100");

        RuleFor(x => x.EPS_CIDADE).NotEmpty().WithMessage("Cidade é obrigatória")
            .MaximumLength(100).WithMessage("Cidade deve ter no máximo 100 caracteres");

        RuleFor(x => x.EPS_LOCAL!).MaximumLength(300).WithMessage("Local deve ter no máximo 300 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EPS_LOCAL));

        RuleFor(x => x.EPS_STATUS).Must(s => Enum.IsDefined(s)).WithMessage("Status é obrigatório");

        RuleFor(x => x.EPS_LINK!).MaximumLength(500).WithMessage("Link deve ter no máximo 500 caracteres")
            .Must(EventoValidator.UrlHttpValida).WithMessage("Link deve ser uma URL válida (http ou https)")
            .When(x => !string.IsNullOrWhiteSpace(x.EPS_LINK));

        RuleFor(x => x.EPS_OBSERVACOES!).MaximumLength(2000).WithMessage("Observações deve ter no máximo 2000 caracteres")
            .When(x => !string.IsNullOrWhiteSpace(x.EPS_OBSERVACOES));
    }
}
