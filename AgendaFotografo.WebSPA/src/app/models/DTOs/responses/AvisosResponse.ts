/* eslint-disable @typescript-eslint/naming-convention */
import { AvisoItem } from './AvisoItem';

// Resposta de api/Aviso/Listar. Total e Criticos contam todos os avisos; Itens vem limitado a 30.
export class AvisosResponse {
    Total: number;
    Criticos: number;
    Itens: AvisoItem[];
}
