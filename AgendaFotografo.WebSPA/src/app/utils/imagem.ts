// Redução da imagem do flyer antes de enviar ao assistente: lado maior até 1.600 px, JPEG com qualidade 0,85, até 2 MB.

export const IMAGEM_LADO_MAX = 1600;
export const IMAGEM_ENTRADA_MAX = 20 * 1024 * 1024;
export const IMAGEM_SAIDA_MAX = 2 * 1024 * 1024;

export interface ImagemReduzida {
    MediaType: string;
    /** Base64 puro, sem o prefixo "data:". */
    Base64: string;
    /** O JPEG gerado (para a miniatura). */
    Blob: Blob;
}

const MSG_ILEGIVEL = 'Não consegui ler esta imagem. Envie JPG, PNG ou um print.';

/** Reduz o arquivo de imagem. Rejeita com `Error` cuja `message` já está em pt-BR para mostrar ao usuário. */
export async function reduzirImagem(arquivo: File): Promise<ImagemReduzida> {
    if (!arquivo.type.startsWith('image/')) {
        throw new Error('O arquivo precisa ser uma imagem.');
    }
    if (arquivo.size > IMAGEM_ENTRADA_MAX) {
        throw new Error('A imagem é grande demais (máximo de 20 MB).');
    }

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(arquivo);
    } catch {
        throw new Error(MSG_ILEGIVEL);
    }

    try {
        const escala = Math.min(1, IMAGEM_LADO_MAX / Math.max(bitmap.width, bitmap.height));
        const largura = Math.max(1, Math.round(bitmap.width * escala));
        const altura = Math.max(1, Math.round(bitmap.height * escala));
        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error(MSG_ILEGIVEL);
        }
        // Fundo branco: PNG com transparência não pode virar preto no JPEG.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(bitmap, 0, 0, largura, altura);

        let blob = await paraJpeg(canvas, 0.85);
        if (blob && blob.size > IMAGEM_SAIDA_MAX) {
            blob = await paraJpeg(canvas, 0.7);
        }
        if (!blob) {
            throw new Error(MSG_ILEGIVEL);
        }
        if (blob.size > IMAGEM_SAIDA_MAX) {
            throw new Error('A imagem continua grande demais depois de reduzida. Tente um print menor.');
        }
        return { MediaType: 'image/jpeg', Base64: await paraBase64(blob), Blob: blob };
    } finally {
        bitmap.close();
    }
}

function paraJpeg(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob | null> {
    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/jpeg', qualidade));
}

function paraBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const leitor = new FileReader();
        leitor.onload = () => {
            const url = String(leitor.result ?? '');
            const i = url.indexOf(',');
            i >= 0 ? resolve(url.substring(i + 1)) : reject(new Error(MSG_ILEGIVEL));
        };
        leitor.onerror = () => reject(new Error(MSG_ILEGIVEL));
        leitor.readAsDataURL(blob);
    });
}
