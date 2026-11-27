/* eslint-disable @typescript-eslint/naming-convention */
// AssinanteModel da API. Entrada: Id, ASS_NOME, ASS_CPF_CNPJ, ASS_EMAIL, ASS_TELEFONE, ASS_TESTE_ATE (e ASS_PLANO_ID só no Criar).
// Só saída: ASS_ATIVO, ExigirTrocaSenha, LastLogin, CreatedAt (a API ignora na entrada).
export class Assinante {
    Id?: string;
    ASS_NOME: string;
    ASS_CPF_CNPJ?: string | null;
    ASS_EMAIL: string;
    ASS_TELEFONE?: string | null;
    ASS_ATIVO?: boolean;
    ExigirTrocaSenha?: boolean;
    LastLogin?: string | null;
    CreatedAt?: string;
    /** Entrada e saída: "yyyy-MM-dd" ou null (sem prazo). */
    ASS_TESTE_ATE?: string | null;
    /** Só saída (TipoAssinante, plano 24: 1 = com plano, 2 = Gratuito). */
    ASS_TIPO?: number;
    /**
     * Plano 24. Entrada só no Criar (null = plano do autocadastro); o Atualizar ignora (a troca é pelo AlterarPlano).
     * Na saída, null no Gratuito.
     */
    ASS_PLANO_ID?: string | null;
    /** Só saída: nome do plano (null = Gratuito). */
    PlanoNome?: string | null;
    /** Só saída (OrigemAssinante). */
    ASS_ORIGEM?: number;
    /** Só saída: null = sem prazo, 0 = encerrado. */
    TesteDiasRestantes?: number | null;
}
