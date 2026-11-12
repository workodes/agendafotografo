namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Autocadastro com e-mail e senha. Telefone e CPF/CNPJ trafegam só com dígitos. Nomes C# exatos no JSON.</summary>
public class CadastroModel
{
    public string ASS_NOME { get; set; } = string.Empty;
    public string ASS_EMAIL { get; set; } = string.Empty;
    public string ASS_TELEFONE { get; set; } = string.Empty;
    public string ASS_CPF_CNPJ { get; set; } = string.Empty;
    public string Senha { get; set; } = string.Empty;
}
