import { EventoPendenciaItem } from './EventoPendenciaItem';

/* eslint-disable @typescript-eslint/naming-convention */
// Resposta de api/Evento/AplicarChecklist: quantas pendências o checklist padrão acrescentou e a lista da ficha (na ordem da ficha).
export class EventoAplicarChecklistResponse {
    Adicionadas: number;
    Itens: EventoPendenciaItem[];
}
