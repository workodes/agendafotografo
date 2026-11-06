/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/CategoriaPendencia.cs. Os valores numéricos fazem parte do contrato com a API.
export enum CategoriaPendencia {
    Contrato = 1,
    EscalaEquipe = 2,
    RotaInformacoes = 3,
    PlataformaFotos = 4,
    Equipamento = 5,
    EntregaFotos = 6,
    Organizador = 7,
    Outros = 8,
}

export const CATEGORIA_PENDENCIA_ROTULO: Record<number, string> = {
    [CategoriaPendencia.Contrato]: 'Contrato',
    [CategoriaPendencia.EscalaEquipe]: 'Escala de equipe',
    [CategoriaPendencia.RotaInformacoes]: 'Rota/Informações',
    [CategoriaPendencia.PlataformaFotos]: 'Plataforma de fotos (liberar vagas)',
    [CategoriaPendencia.Equipamento]: 'Equipamento',
    [CategoriaPendencia.EntregaFotos]: 'Entrega das fotos',
    [CategoriaPendencia.Organizador]: 'Organizador',
    [CategoriaPendencia.Outros]: 'Outros',
};

// Lista para o select de categoria.
export const CATEGORIA_PENDENCIA: { valor: number; rotulo: string }[] = [
    CategoriaPendencia.Contrato, CategoriaPendencia.EscalaEquipe, CategoriaPendencia.RotaInformacoes, CategoriaPendencia.PlataformaFotos,
    CategoriaPendencia.Equipamento, CategoriaPendencia.EntregaFotos, CategoriaPendencia.Organizador, CategoriaPendencia.Outros,
].map(valor => ({ valor, rotulo: CATEGORIA_PENDENCIA_ROTULO[valor] }));
