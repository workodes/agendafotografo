/* eslint-disable @typescript-eslint/naming-convention */
// Saída de api/LinkPublico/Acessar. Acesso = JWT enviado em X-Acesso-Link (nunca em Authorization); ExpiraEm = ISO de 7 dias.
export class LinkPublicoAcesso {
    Acesso: string;
    ExpiraEm: string;
}
