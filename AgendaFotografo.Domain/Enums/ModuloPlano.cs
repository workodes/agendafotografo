using System.ComponentModel;

namespace AgendaFotografo.Domain.Enums;

/// <summary>
/// Módulos (telas inteiras) que um plano libera (plano 24). Valores fixos (número no JSON, int no banco em <c>PLM_MODULO</c>).
/// <c>[Description]</c> = nome na tela e no 403 ("&lt;Nome&gt; não está disponível no seu plano.").
/// Módulo novo = uma linha aqui, com valor novo (nunca reaproveitar número): aparece sozinho na tela de planos, desligado em todos os
/// planos (inclusive no "Coordenador completo"; o Admin liga pela tela). Os módulos sempre liberados (base) não entram aqui
/// (ver <c>PlanosPadrao.ModulosBase</c>).
/// Valores RESERVADOS (saíram do catálogo e não podem ser reaproveitados): 3 = Pendências (com o checklist padrão), que virou base no
/// Ajuste 1 do plano 24. Sem membro no enum, o 3 é recusado pelo validator ("Módulo inválido."), não aparece em <c>Plano/Modulos</c> e,
/// se existir em <c>PLM_MODULO</c>, não libera nada.
/// </summary>
public enum ModuloPlano
{
    [Description("Início")]
    Inicio = 1,

    [Description("Visão da semana")]
    VisaoSemana = 2,

    // 3: reservado (era Pendências; virou base no Ajuste 1 do plano 24). Não reutilizar.

    [Description("Link público")]
    LinkPublico = 4,

    [Description("Avisos")]
    Avisos = 5,

    [Description("Assistente")]
    Assistente = 6,

    [Description("Financeiro")]
    Financeiro = 7
}
