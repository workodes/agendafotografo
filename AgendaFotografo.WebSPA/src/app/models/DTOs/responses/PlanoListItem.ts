/* eslint-disable @typescript-eslint/naming-convention */
// Linha de GET Plano/Listar (plano 24).
export class PlanoListItem {
    Id: string;
    PLA_NOME: string;
    PLA_VALOR: number;
    /** RecorrenciaPlano: 1 Mensal, 2 Anual. */
    PLA_RECORRENCIA: number;
    PLA_ATIVO: boolean;
    PLA_MOSTRAR_LANDING: boolean;
    PLA_ORDEM: number;
    QtdModulos: number;
    QtdAssinantes: number;
    PadraoAutocadastro: boolean;
}
