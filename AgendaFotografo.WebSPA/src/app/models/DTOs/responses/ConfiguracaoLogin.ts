// Resposta de GET Auth/ConfiguracaoLogin (anônimo). GoogleClientId nulo = sem botão do Google.
export interface ConfiguracaoLogin {
    GoogleClientId: string | null;
    DiasGratis: number;
    /** true = o envio de e-mails está ligado (confirmação de e-mail e "Esqueci minha senha"). */
    EmailLigado?: boolean;
}
