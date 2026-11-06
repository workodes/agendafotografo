namespace AgendaFotografo.WebApi.Models.Avisos;

/// <summary>Gravidade do aviso. Valores fixos (trafegam como número no JSON; manter sincronia com o front). Não persistido.</summary>
public enum GravidadeAviso
{
    Critico = 1,
    Atencao = 2
}
