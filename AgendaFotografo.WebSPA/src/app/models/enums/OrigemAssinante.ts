/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/OrigemAssinante.cs. Os valores numéricos fazem parte do contrato com a API.
export enum OrigemAssinante {
    Admin = 1,
    Autocadastro = 2,
}

export const ORIGEM_ASSINANTE_ROTULO: Record<number, string> = {
    [OrigemAssinante.Admin]: 'Admin',
    [OrigemAssinante.Autocadastro]: 'Autocadastro',
};
