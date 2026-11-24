/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/CategoriaLancamento.cs. Os valores numéricos fazem parte do contrato com a API.
export enum CategoriaLancamento {
    SemCategoria = 1,
    Servicos = 2,
    Vendas = 3,
    Equipamentos = 4,
    Transporte = 5,
    Alimentacao = 6,
    Marketing = 7,
    Outros = 8,
    SoftwareAssinaturas = 9,
}

export const CATEGORIA_LANCAMENTO_ROTULO: Record<number, string> = {
    [CategoriaLancamento.SemCategoria]: 'Sem categoria',
    [CategoriaLancamento.Servicos]: 'Serviços',
    [CategoriaLancamento.Vendas]: 'Vendas',
    [CategoriaLancamento.Equipamentos]: 'Equipamentos',
    [CategoriaLancamento.Transporte]: 'Transporte',
    [CategoriaLancamento.Alimentacao]: 'Alimentação',
    [CategoriaLancamento.Marketing]: 'Marketing',
    [CategoriaLancamento.SoftwareAssinaturas]: 'Software e assinaturas',
    [CategoriaLancamento.Outros]: 'Outros',
};

// Lista para o select, na ordem de exibição ("Outros" por último; o valor 9 vem antes dele).
export const CATEGORIA_LANCAMENTO: { valor: number; rotulo: string }[] = [
    CategoriaLancamento.SemCategoria, CategoriaLancamento.Servicos, CategoriaLancamento.Vendas, CategoriaLancamento.Equipamentos,
    CategoriaLancamento.Transporte, CategoriaLancamento.Alimentacao, CategoriaLancamento.Marketing,
    CategoriaLancamento.SoftwareAssinaturas, CategoriaLancamento.Outros,
].map(valor => ({ valor, rotulo: CATEGORIA_LANCAMENTO_ROTULO[valor] }));
