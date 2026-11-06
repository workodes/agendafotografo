// Copia texto para a área de transferência. Deve ser chamado direto no clique (Safari do iPhone exige gesto do usuário).
// Sem HTTPS a Clipboard API não existe: usa o método antigo. Devolve true se copiou.
export function copiarTexto(texto: string): Promise<boolean> {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(texto).then(() => true, () => Promise.resolve(copiarLegado(texto)));
    }
    return Promise.resolve(copiarLegado(texto));
}

function copiarLegado(texto: string): boolean {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        document.body.removeChild(campo);
    }
}
