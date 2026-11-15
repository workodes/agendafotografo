namespace AgendaFotografo.WebApi.Models.Auth;

/// <summary>Resposta de <c>ReenviarCodigo</c> e <c>CorrigirEmail</c>.</summary>
public class CodigoEnvioResponse
{
    /// <summary>Endereço de destino do código (o e-mail novo, no <c>CorrigirEmail</c>).</summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>Verdadeiro quando o envio deste pedido falhou (o reenvio já está liberado).</summary>
    public bool EnvioFalhou { get; set; }

    /// <summary>Segundos até liberar "Reenviar código" (0 a 60).</summary>
    public int ReenviarEmSegundos { get; set; }
}
