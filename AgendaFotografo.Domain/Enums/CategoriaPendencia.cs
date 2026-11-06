namespace AgendaFotografo.Domain.Enums;

/// <summary>Categoria da pendência (sem categorias financeiras). Valores fixos (número no JSON, int no banco).</summary>
public enum CategoriaPendencia
{
    Contrato = 1,
    EscalaEquipe = 2,
    RotaInformacoes = 3,
    PlataformaFotos = 4,
    Equipamento = 5,
    EntregaFotos = 6,
    Organizador = 7,
    Outros = 8
}
