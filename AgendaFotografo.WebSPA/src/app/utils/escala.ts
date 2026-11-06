import { EventoResumo } from 'app/models/DTOs/responses/EventoResumo';
import { formatarHora } from 'app/utils/data-evento';

/** "Também em: Corrida X às 07:00 (Cidade); Treino Y, hora a confirmar (Cidade)". Vazio quando não há outros eventos. */
import { localCidade } from 'app/utils/local-evento';

export function textoOutrosEventos(outros: EventoResumo[] | null | undefined): string {
    if (!outros?.length) {
        return '';
    }
    const itens = outros.map(e => `${e.EVE_NOME}${e.EVE_HORA ? ' às ' + formatarHora(e.EVE_HORA) : ', hora a confirmar'} (${localCidade(e)})`);
    return `Também em: ${itens.join('; ')}`;
}
