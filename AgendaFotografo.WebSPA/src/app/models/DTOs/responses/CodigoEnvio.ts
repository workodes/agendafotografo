/* eslint-disable @typescript-eslint/naming-convention */
// Resposta de ReenviarCodigo e CorrigirEmail (CodigoEnvioResponse).
export interface CodigoEnvioResponse {
    /** E-mail de destino do código. */
    Email: string;
    EnvioFalhou: boolean;
    /** 0 a 60: quando o "Reenviar código" libera. */
    ReenviarEmSegundos: number;
}
