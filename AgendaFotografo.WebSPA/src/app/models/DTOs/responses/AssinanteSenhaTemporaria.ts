import { Assinante } from 'app/models/entities/Assinante';

// Resposta de Criar e RedefinirAcesso. A senha existe só em memória: nunca vai para storage, console ou URL.
export class AssinanteSenhaTemporaria {
    Assinante: Assinante;
    SenhaTemporaria: string;
}
