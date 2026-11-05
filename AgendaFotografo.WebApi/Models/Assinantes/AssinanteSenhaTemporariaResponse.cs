namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>Resposta de Criar e RedefinirAcesso. A senha temporária é exibida UMA vez e nunca é guardada nem logada.</summary>
public class AssinanteSenhaTemporariaResponse
{
    public AssinanteModel Assinante { get; set; } = new();
    public string SenhaTemporaria { get; set; } = string.Empty;
}
