/* eslint-disable @typescript-eslint/naming-convention */
// Body de PUT Assinante/AlterarPlano (plano 24). Gratuito = true ignora o plano; false exige ASS_PLANO_ID.
export interface AssinantePlanoModel {
    Id: string;
    Gratuito: boolean;
    ASS_PLANO_ID: string | null;
}
