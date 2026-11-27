/* eslint-disable @typescript-eslint/naming-convention */
// PlanoModel da API (plano 24). Entrada: Id, PLA_NOME, PLA_VALOR, PLA_RECORRENCIA, PLA_MOSTRAR_LANDING, PLA_DESCRICAO, PLA_ORDEM,
// PLA_DESTAQUE e Modulos. Só saída (a API ignora na entrada): PLA_ATIVO, QtdAssinantes e PadraoAutocadastro.
export class Plano {
    Id?: string | null;
    PLA_NOME: string;
    /** Valor em reais, só exibição (0 a 99.999.999,99). */
    PLA_VALOR: number;
    /** RecorrenciaPlano: 1 Mensal, 2 Anual. */
    PLA_RECORRENCIA: number;
    PLA_MOSTRAR_LANDING: boolean;
    PLA_DESCRICAO?: string | null;
    PLA_ORDEM: number;
    PLA_DESTAQUE: boolean;
    /** Módulos liberados (linha presente = liberado). Lista vazia é válida (só a base). */
    Modulos: PlanoModuloItem[];
    PLA_ATIVO?: boolean;
    QtdAssinantes?: number;
    /** Plano do autocadastro ("Coordenador completo"): não pode ser excluído nem inativado. */
    PadraoAutocadastro?: boolean;
}

export class PlanoModuloItem {
    /** ModuloPlano. */
    PLM_MODULO: number;
    /** Texto do módulo na vitrine da landing (até 150; ainda não exibido). */
    PLM_TEXTO_LANDING?: string | null;
}
