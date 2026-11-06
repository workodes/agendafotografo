import { formatarData, formatarDiaMes, parseDataIso } from './data-evento';

/** Prazo da pendência: "dd/MM" (com o ano se não for o atual); sem prazo devolve o texto informado. */
export function formatarPrazo(prazo: string | null | undefined, vazio: string = 'Sem prazo'): string {
    const d = parseDataIso(prazo);
    if (!d) {
        return vazio;
    }
    return d.getFullYear() === new Date().getFullYear() ? formatarDiaMes(prazo) : formatarData(prazo);
}
