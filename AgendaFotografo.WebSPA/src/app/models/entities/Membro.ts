/* eslint-disable @typescript-eslint/naming-convention */
// MembroModel da API. MEM_INSTAGRAM trafega sem "@"; MEM_TELEFONE só com dígitos; MEM_FUNCAO é o enum FuncaoMembro (1 a 3).
// MEM_ATIVO só vem na saída (o status muda por Inativar/Ativar).
export class Membro {
    Id?: string;
    MEM_NOME: string;
    MEM_INSTAGRAM?: string | null;
    MEM_EMAIL?: string | null;
    MEM_TELEFONE?: string | null;
    /** Só dígitos (11) ou null. Vem só no Obter/Criar/Atualizar; Inativar/Ativar devolvem null de propósito (plano 20). */
    MEM_CPF?: string | null;
    MEM_FUNCAO: number;
    MEM_OBSERVACOES?: string | null;
    MEM_ATIVO?: boolean;
}
