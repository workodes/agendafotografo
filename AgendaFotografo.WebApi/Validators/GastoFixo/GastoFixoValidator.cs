using AgendaFotografo.WebApi.Models.Financeiro;
using AgendaFotografo.WebApi.Validators.Financeiro;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.GastoFixo;

/// <summary>Validação do formato da ficha do gasto fixo (não consulta o banco).</summary>
public class GastoFixoValidator : AbstractValidator<GastoFixoModel>
{
    public GastoFixoValidator()
    {
        RuleFor(x => x.GAF_TITULO).NotEmpty().WithMessage("Título é obrigatório")
            .MaximumLength(200).WithMessage("Título deve ter no máximo 200 caracteres");
        RuleFor(x => x.GAF_VALOR).ValorEmReais();
        RuleFor(x => x.GAF_CATEGORIA).IsInEnum().WithMessage("Categoria inválida");
        RuleFor(x => x.GAF_DIA).InclusiveBetween(1, 31).WithMessage("Dia do mês deve estar entre 1 e 31");
    }
}
