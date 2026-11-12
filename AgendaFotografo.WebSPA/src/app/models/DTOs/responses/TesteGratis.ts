/* eslint-disable @typescript-eslint/naming-convention */
// Resposta de GET Auth/TesteGratis (Assinante). DiasRestantes: null = sem prazo, 0 = encerrado.
export interface TesteGratis {
    ASS_TESTE_ATE: string | null;
    DiasRestantes: number | null;
}
