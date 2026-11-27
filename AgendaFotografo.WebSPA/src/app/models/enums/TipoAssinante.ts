/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/TipoAssinante.cs. Os valores numéricos fazem parte do contrato com a API.
// Plano 24: 1 = conta com plano (coordenador ou fotógrafo pago, role Assinante); 2 = Gratuito (só vê a agenda da escala, role Fotografo).
// Os nomes do enum continuam (o cadastro ainda fala em "Coordeno uma equipe" / "Sou fotógrafo"); só os rótulos do Admin mudaram.
export enum TipoAssinante {
    Coordenador = 1,
    Fotografo = 2,
}

/** Rótulos do Admin (plano 24). */
export const TIPO_ASSINANTE_ROTULO: Record<number, string> = {
    [TipoAssinante.Coordenador]: 'Com plano',
    [TipoAssinante.Fotografo]: 'Gratuito',
};
