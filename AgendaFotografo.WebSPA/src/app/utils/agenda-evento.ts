// "Adicionar à agenda" do link público: arquivo .ics (iPhone, Outlook, agenda do Android) e link do Google Agenda.
// Hora "flutuante" (sem fuso): a agenda usa o fuso do aparelho, igual ao resto do sistema. Sem hora = evento de dia inteiro.
// Duração padrão de 3 horas (o sistema não guarda o fim do evento). Nada aqui chama a API.

export interface DadosAgenda {
    Uid: string;
    Titulo: string;
    Data: string;          // yyyy-MM-dd
    Hora?: string | null;  // HH:mm:ss ou null
    Local?: string | null;
    Url: string;
}

const DURACAO_HORAS = 3;

function dois(n: number): string {
    return String(n).padStart(2, '0');
}

function partes(d: DadosAgenda): { inicio: string; fim: string; diaInteiro: boolean } {
    const [a, m, dia] = d.Data.split('-').map(Number);
    const hora = /^\d{2}:\d{2}/.test(d.Hora ?? '') ? d.Hora!.split(':').map(Number) : null;
    if (!hora) {
        const fim = new Date(a, m - 1, dia + 1);
        return { inicio: `${a}${dois(m)}${dois(dia)}`, fim: `${fim.getFullYear()}${dois(fim.getMonth() + 1)}${dois(fim.getDate())}`, diaInteiro: true };
    }
    const ini = new Date(a, m - 1, dia, hora[0], hora[1]);
    const fim = new Date(ini.getTime() + DURACAO_HORAS * 3600e3);
    const fmt = (x: Date) => `${x.getFullYear()}${dois(x.getMonth() + 1)}${dois(x.getDate())}T${dois(x.getHours())}${dois(x.getMinutes())}00`;
    return { inicio: fmt(ini), fim: fmt(fim), diaInteiro: false };
}

function escaparIcs(t: string): string {
    return t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// Linhas do .ics têm no máximo 75 octetos; as seguintes começam com espaço.
function dobrar(linha: string): string {
    const bytes = new TextEncoder().encode(linha);
    if (bytes.length <= 75) {
        return linha;
    }
    const saida: string[] = [];
    let atual = '';
    let tam = 0;
    for (const ch of linha) {
        const t = new TextEncoder().encode(ch).length;
        if (tam + t > (saida.length ? 74 : 75)) {
            saida.push(atual);
            atual = '';
            tam = 0;
        }
        atual += ch;
        tam += t;
    }
    saida.push(atual);
    return saida.join('\r\n ');
}

export function textoIcs(d: DadosAgenda): string {
    const p = partes(d);
    const agora = new Date();
    const stamp = `${agora.getUTCFullYear()}${dois(agora.getUTCMonth() + 1)}${dois(agora.getUTCDate())}T${dois(agora.getUTCHours())}${dois(agora.getUTCMinutes())}${dois(agora.getUTCSeconds())}Z`;
    const linhas = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//quemclica//evento//PT-BR',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${d.Uid}`,
        `DTSTAMP:${stamp}`,
        p.diaInteiro ? `DTSTART;VALUE=DATE:${p.inicio}` : `DTSTART:${p.inicio}`,
        p.diaInteiro ? `DTEND;VALUE=DATE:${p.fim}` : `DTEND:${p.fim}`,
        `SUMMARY:${escaparIcs(d.Titulo)}`,
        d.Local ? `LOCATION:${escaparIcs(d.Local)}` : '',
        `DESCRIPTION:${escaparIcs(`Página do evento: ${d.Url}`)}`,
        `URL:${d.Url}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Lembrete do evento',
        'TRIGGER:-P1D',
        'END:VALARM',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(l => !!l);
    return linhas.map(dobrar).join('\r\n') + '\r\n';
}

export function urlGoogleAgenda(d: DadosAgenda): string {
    const p = partes(d);
    const q = new URLSearchParams({ action: 'TEMPLATE', text: d.Titulo, dates: `${p.inicio}/${p.fim}`, details: `Página do evento: ${d.Url}` });
    if (d.Local) {
        q.set('location', d.Local);
    }
    return `https://calendar.google.com/calendar/render?${q}`;
}

/** iPhone/iPad (inclui o iPad que se apresenta como Mac). */
export function ehIos(): boolean {
    return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** No iPhone o Safari abre o .ics direto ("Adicionar ao Calendário"); nos demais baixa o arquivo. */
export function abrirIcs(d: DadosAgenda, nomeArquivo = 'evento.ics'): void {
    const blob = new Blob([textoIcs(d)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    if (ehIos()) {
        window.location.href = url;
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
