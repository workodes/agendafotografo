// Resposta de POST /api/Auth/Login (nomes exatos do C#: LoginResponse).
export interface AuthModel {
    Token: string;
    ExpiraEm: string;
    Id: string;
    FullName: string;
    Email: string;
    /** `Admin`, `Assinante` ou `Fotografo`: define a área (rota) do SPA. */
    Role: string;
    /** Senha inicial ou temporária: o SPA exige a troca antes de usar o sistema. */
    ExigirTrocaSenha: boolean;
    /** Nome do assinante (só perfil Assinante; null para o Admin). */
    AssinanteNome?: string | null;
    /** false = conta que entra só pelo Google (sem senha para alterar). */
    TemSenha?: boolean;
    /** Plano 24: nome do plano (só Assinante; null = Gratuito, Admin ou conta sem plano). */
    PlanoNome?: string | null;
    /** Plano 24: módulos liberados (ModuloPlano). null para Admin e Fotografo; [] = Assinante só com a base. */
    Modulos?: number[] | null;
    /** Cadastro manual/login com e-mail por confirmar: Token vem vazio e só Email e os dois campos abaixo valem. */
    ConfirmacaoPendente?: boolean;
    EnvioFalhou?: boolean;
    ReenviarEmSegundos?: number;
}
