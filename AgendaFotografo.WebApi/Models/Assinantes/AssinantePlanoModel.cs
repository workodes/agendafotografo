namespace AgendaFotografo.WebApi.Models.Assinantes;

/// <summary>
/// Entrada do <c>Assinante/AlterarPlano</c> (plano 24). <c>Gratuito</c> verdadeiro ignora o plano (conta Gratuito: só vê a agenda da
/// escala); falso exige <c>ASS_PLANO_ID</c>.
/// </summary>
public class AssinantePlanoModel
{
    public Guid Id { get; set; }
    public bool Gratuito { get; set; }
    public Guid? ASS_PLANO_ID { get; set; }
}
