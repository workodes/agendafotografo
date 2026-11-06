using AgendaFotografo.WebApi.Models.Cadastros;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.PendenciaModelo;

/// <summary>Validação do formato da ficha. A existência do tipo de evento é checada no controller (consulta ao banco).</summary>
public class PendenciaModeloValidator : AbstractValidator<PendenciaModeloModel>
{
    public PendenciaModeloValidator()
    {
        RuleFor(x => x.PEM_TITULO).NotEmpty().WithMessage("Título é obrigatório")
            .MaximumLength(200).WithMessage("Título deve ter no máximo 200 caracteres");
        RuleFor(x => x.PEM_CATEGORIA).IsInEnum().WithMessage("Categoria inválida");
        RuleFor(x => x.PEM_PRIORIDADE).IsInEnum().WithMessage("Prioridade inválida");
        RuleFor(x => x.PEM_DIAS_ANTES!.Value)
            .InclusiveBetween(-90, 365).WithMessage("Dias antes do evento deve estar entre -90 e 365")
            .When(x => x.PEM_DIAS_ANTES is not null);
    }
}
