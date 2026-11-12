namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Completar o cadastro depois do Google. Sem e-mail: ele vem sempre do token.</summary>
public class CadastroGoogleModel
{
    public string IdToken { get; set; } = string.Empty;
    public string ASS_NOME { get; set; } = string.Empty;
    public string ASS_TELEFONE { get; set; } = string.Empty;
    public string ASS_CPF_CNPJ { get; set; } = string.Empty;
}
