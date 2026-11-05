using AgendaFotografo.WebApi.Models.Cadastros;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.TipoEvento;

/// <summary>Validação do formato da ficha. A duplicidade de nome é checada no controller (consulta ao banco).</summary>
public class TipoEventoValidator : AbstractValidator<TipoEventoModel>
{
    public TipoEventoValidator()
    {
        RuleFor(x => x.TPE_NOME).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(60).WithMessage("Nome deve ter no máximo 60 caracteres");
    }
}
