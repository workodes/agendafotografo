// Usuário logado (montado a partir da resposta de Auth/Login).
export class Usuario {
    Id?: string;
    Email?: string;
    FullName?: string;
    Role?: string;
    ExigirTrocaSenha?: boolean;
    /** Só perfil Assinante: nome do assinante (tenant). */
    AssinanteNome?: string | null;
    /** false = conta só Google. Ausente (sessão antiga) = tem senha. */
    TemSenha?: boolean;
    /** Plano 24 (só Assinante): nome do plano. */
    PlanoNome?: string | null;
    /**
     * Plano 24 (só Assinante): módulos liberados (ModuloPlano), guardados só para a rota inicial ficar síncrona; recarregados a
     * cada entrada no app (a API é quem manda). null/ausente = sem filtro.
     */
    Modulos?: number[] | null;
}
