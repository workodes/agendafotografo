// Resposta de GET Auth/ConfiguracaoLogin (anônimo). GoogleClientId nulo = sem botão do Google.
export interface ConfiguracaoLogin {
    GoogleClientId: string | null;
    DiasGratis: number;
}
