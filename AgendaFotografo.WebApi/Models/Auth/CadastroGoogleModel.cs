namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Completar o cadastro depois do Google. Sem e-mail: ele vem sempre do token.</summary>
public class CadastroGoogleModel
{
    public string IdToken { get; set; } = string.Empty;
    public string ASS_NOME { get; set; } = string.Empty;
    public string ASS_TELEFONE { get; set; } = string.Empty;
    public string ASS_CPF_CNPJ { get; set; } = string.Empty;

    /// <summary>Perfil da conta: 1 Coordenador, 2 Fotografo. Ausente ou 0 = Coordenador; outro valor = 400 "Perfil inválido.". Fotógrafo exige CPF.</summary>
    public int ASS_TIPO { get; set; }
}
