/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/ModuloPlano.cs (plano 24). Os valores numéricos fazem parte do contrato com a API.
// Módulo novo: uma linha aqui (com o mesmo número do C#) e o rótulo abaixo; a tela de planos lista o catálogo que vem da API.
export enum ModuloPlano {
    Inicio = 1,
    VisaoSemana = 2,
    // 3: reservado (era Pendências, que virou base no ajuste 1 do plano 24); não reutilizar o número.
    LinkPublico = 4,
    Avisos = 5,
    Assistente = 6,
    Financeiro = 7,
}

// Mesmos nomes do [Description] do C#: a API monta o 403 com eles ("<Nome> não está disponível no seu plano.").
export const MODULO_PLANO_ROTULO: Record<number, string> = {
    [ModuloPlano.Inicio]: 'Início',
    [ModuloPlano.VisaoSemana]: 'Visão da semana',
    [ModuloPlano.LinkPublico]: 'Link público',
    [ModuloPlano.Avisos]: 'Avisos',
    [ModuloPlano.Assistente]: 'Assistente',
    [ModuloPlano.Financeiro]: 'Financeiro',
};

// Ícone (heroicons_outline) de cada módulo nos cartões da ficha do plano. Módulo sem ícone usa o genérico.
export const MODULO_PLANO_ICONE: Record<number, string> = {
    [ModuloPlano.Inicio]: 'heroicons_outline:home',
    [ModuloPlano.VisaoSemana]: 'heroicons_outline:sun',
    [ModuloPlano.LinkPublico]: 'heroicons_outline:link',
    [ModuloPlano.Avisos]: 'heroicons_outline:bell',
    [ModuloPlano.Assistente]: 'heroicons_outline:sparkles',
    [ModuloPlano.Financeiro]: 'heroicons_outline:banknotes',
};

/** Texto padrão do 403 de módulo: "<Nome> não está disponível no seu plano." */
export const SUFIXO_BLOQUEIO_MODULO = ' não está disponível no seu plano.';

/** Lê o módulo a partir do texto do 403 da API (nulo se o texto não for de módulo ou o nome não for conhecido). */
export function moduloDoBloqueio(texto: unknown): ModuloPlano | null {
    if (typeof texto !== 'string' || !texto.endsWith(SUFIXO_BLOQUEIO_MODULO)) {
        return null;
    }
    const nome = texto.slice(0, -SUFIXO_BLOQUEIO_MODULO.length).trim();
    const achado = Object.entries(MODULO_PLANO_ROTULO).find(([, rotulo]) => rotulo === nome);
    return achado ? (Number(achado[0]) as ModuloPlano) : null;
}

/** O texto é o 403 de módulo do plano (mesmo com nome de módulo que o SPA ainda não conhece). */
export function ehBloqueioDeModulo(texto: unknown): boolean {
    return typeof texto === 'string' && texto.endsWith(SUFIXO_BLOQUEIO_MODULO);
}
