namespace AgendaFotografo.Domain.Enums;

/// <summary>
/// Categoria do lançamento e do gasto fixo (lista fixa). Valores fixos (número no JSON, int no banco).
/// "Outros" (8) aparece por último na tela; "Software e assinaturas" entrou depois, com o valor 9.
/// </summary>
public enum CategoriaLancamento
{
    SemCategoria = 1,
    Servicos = 2,
    Vendas = 3,
    Equipamentos = 4,
    Transporte = 5,
    Alimentacao = 6,
    Marketing = 7,
    Outros = 8,
    SoftwareAssinaturas = 9
}
