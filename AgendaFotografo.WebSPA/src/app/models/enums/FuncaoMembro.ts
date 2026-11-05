/* eslint-disable @typescript-eslint/naming-convention */
// Espelha AgendaFotografo.Domain/Enums/FuncaoMembro.cs. Os valores numéricos fazem parte do contrato com a API.
export enum FuncaoMembro {
    Fotografo = 1,
    Editor = 2,
    Assistente = 3,
}

export const FUNCAO_MEMBRO_ROTULO: Record<number, string> = {
    [FuncaoMembro.Fotografo]: 'Fotógrafo',
    [FuncaoMembro.Editor]: 'Editor',
    [FuncaoMembro.Assistente]: 'Assistente',
};

// Lista para o select de função (cadastro e filtro).
export const FUNCAO_MEMBRO: { valor: number; rotulo: string }[] = [
    FuncaoMembro.Fotografo, FuncaoMembro.Editor, FuncaoMembro.Assistente,
].map(valor => ({ valor, rotulo: FUNCAO_MEMBRO_ROTULO[valor] }));
