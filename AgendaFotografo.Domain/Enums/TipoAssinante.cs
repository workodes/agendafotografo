namespace AgendaFotografo.Domain.Enums;

/// <summary>
/// Tipo da conta de assinante. Valores fixos (trafegam como número no JSON e são gravados como int).
/// Plano 24: 1 = conta com plano (coordenador ou fotógrafo pago); 2 = Gratuito (o fotógrafo gratuito dos planos 20, 21 e 23).
/// Os nomes dos membros foram mantidos.
/// </summary>
public enum TipoAssinante
{
    Coordenador = 1,
    Fotografo = 2
}
