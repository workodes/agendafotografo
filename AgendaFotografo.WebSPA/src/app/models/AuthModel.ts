// Resposta de POST /api/Auth/Login (nomes exatos do C#: LoginResponse).
export interface AuthModel {
    Token: string;
    ExpiraEm: string;
    Id: string;
    FullName: string;
    Email: string;
    /** `Admin` ou `Assinante`: define a área (rota) do SPA. */
    Role: string;
    /** Senha inicial ou temporária: o SPA exige a troca antes de usar o sistema. */
    ExigirTrocaSenha: boolean;
    /** Nome do assinante (só perfil Assinante; null para o Admin). */
    AssinanteNome?: string | null;
    /** false = conta que entra só pelo Google (sem senha para alterar). */
    TemSenha?: boolean;
}
