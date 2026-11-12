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
}
