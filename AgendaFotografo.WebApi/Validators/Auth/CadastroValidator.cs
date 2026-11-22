using AgendaFotografo.CrossCutting.FluentValidation.RuleExtensions;
using AgendaFotografo.WebApi.Models.Auth;
using AgendaFotografo.Domain.Enums;
using FluentValidation;

namespace AgendaFotografo.WebApi.Validators.Auth;

/// <summary>Regras de nome, telefone e CPF/CNPJ do autocadastro (todos obrigatórios). Compartilhadas pelo cadastro manual e pelo do Google.</summary>
internal static class CadastroRegras
{
    public static void Nome<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).NotEmpty().WithMessage("Nome é obrigatório")
            .MaximumLength(200).WithMessage("Nome deve ter no máximo 200 caracteres");

    public static void Telefone<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo)
        => v.RuleFor(campo).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("Telefone é obrigatório").TelefoneValido();

    /// <summary>Perfil: ausente (0), Coordenador (1) ou Fotografo (2); fora disso, "Perfil inválido.".</summary>
    public static bool PerfilValido(int tipo) => tipo is 0 or (int)TipoAssinante.Coordenador or (int)TipoAssinante.Fotografo;

    /// <summary>Ausente (0) vale Coordenador. Só chamar depois de validar com <see cref="PerfilValido"/>.</summary>
    public static TipoAssinante ObterTipo(int tipo) => tipo == 0 ? TipoAssinante.Coordenador : (TipoAssinante)tipo;

    public static void Perfil<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, int>> campo)
        => v.RuleFor(campo).Must(PerfilValido).WithMessage("Perfil inválido.");

    /// <summary>Coordenador: CPF/CNPJ. Fotógrafo: só CPF (CNPJ nunca vale). Perfil inválido não gera erro de documento.</summary>
    public static void CpfCnpj<T>(AbstractValidator<T> v, System.Linq.Expressions.Expression<Func<T, string>> campo,
        Func<T, int> tipo)
    {
        v.RuleFor(campo).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("CPF/CNPJ é obrigatório").CpfOuCnpjValido()
            .When(x => PerfilValido(tipo(x)) && ObterTipo(tipo(x)) == TipoAssinante.Coordenador);
        v.RuleFor(campo).Cascade(CascadeMode.Stop).NotEmpty().WithMessage("CPF é obrigatório")
            .CpfValido().WithMessage("Informe um CPF válido.")
            .When(x => PerfilValido(tipo(x)) && ObterTipo(tipo(x)) == TipoAssinante.Fotografo);
    }
}

public class CadastroValidator : AbstractValidator<CadastroModel>
{
    public CadastroValidator()
    {
        CadastroRegras.Nome(this, x => x.ASS_NOME);
        RuleFor(x => x.ASS_EMAIL).EmailObrigatorio()
            .MaximumLength(200).WithMessage("E-mail deve ter no máximo 200 caracteres");
        CadastroRegras.Telefone(this, x => x.ASS_TELEFONE);
        CadastroRegras.Perfil(this, x => x.ASS_TIPO);
        CadastroRegras.CpfCnpj(this, x => x.ASS_CPF_CNPJ, x => x.ASS_TIPO);
        RuleFor(x => x.Senha).SenhaMinima8();
    }
}

public class CadastroGoogleValidator : AbstractValidator<CadastroGoogleModel>
{
    public CadastroGoogleValidator()
    {
        CadastroRegras.Nome(this, x => x.ASS_NOME);
        CadastroRegras.Telefone(this, x => x.ASS_TELEFONE);
        CadastroRegras.Perfil(this, x => x.ASS_TIPO);
        CadastroRegras.CpfCnpj(this, x => x.ASS_CPF_CNPJ, x => x.ASS_TIPO);
    }
}
