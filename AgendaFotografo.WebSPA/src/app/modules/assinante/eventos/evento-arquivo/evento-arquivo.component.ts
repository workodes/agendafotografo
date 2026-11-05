import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { filter } from 'rxjs';
import { EventoArquivoItem } from 'app/models/DTOs/responses/EventoArquivoItem';
import { TIPO_ARQUIVO_EVENTO_REGRAS, TIPO_ARQUIVO_EVENTO_ROTULO, TipoArquivoEvento } from 'app/models/enums/TipoArquivoEvento';
import { EventoService } from 'app/services/evento.service';
import { extrairMensagemErroBlob } from 'app/utils/blob-error.util';
import { mensagemErro } from 'app/utils/mensagem-erro';

// Um arquivo do evento (flyer, imagem do percurso ou GPX): enviar/trocar, remover, miniatura (imagens) e download (GPX).
// Um arquivo por tipo: enviar outro substitui o anterior. Só funciona com o evento já salvo (eventoId).
@Component({
    standalone: true,
    selector: 'app-evento-arquivo',
    templateUrl: './evento-arquivo.component.html',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
})
export class EventoArquivoComponent implements OnChanges, OnDestroy {
    @Input() eventoId?: string | null;
    @Input({ required: true }) tipo!: number;
    @Input() arquivo?: EventoArquivoItem | null;
    // Emite o arquivo novo (envio) ou null (remoção).
    @Output() arquivoChange = new EventEmitter<EventoArquivoItem | null>();

    previewUrl: string | null = null;
    carregandoPreview = false;
    previewFalhou = false;
    enviando = false;
    ocupado = false;
    private _previewDe?: string;

    constructor(
        private _service: EventoService,
        private _snackBar: MatSnackBar,
        private _confirmacao: FuseConfirmationService,
    ) { }

    get rotulo(): string {
        return TIPO_ARQUIVO_EVENTO_ROTULO[this.tipo];
    }

    get ehImagem(): boolean {
        return this.tipo !== TipoArquivoEvento.Gpx;
    }

    get accept(): string {
        return TIPO_ARQUIVO_EVENTO_REGRAS[this.tipo].extensoes.join(',');
    }

    get dica(): string {
        const r = TIPO_ARQUIVO_EVENTO_REGRAS[this.tipo];
        return `${r.extensoes.map(e => e.replace('.', '').toUpperCase()).join(', ')} até ${r.maxRotulo}`;
    }

    get tamanho(): string {
        const b = this.arquivo?.EVA_TAMANHO ?? 0;
        return b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['arquivo'] && this._previewDe !== this.arquivo?.Id) {
            this.limparPreview();
            this._previewDe = this.arquivo?.Id;
            if (this.arquivo && this.ehImagem) {
                this.carregarPreview(this.arquivo.Id);
            }
        }
    }

    ngOnDestroy(): void {
        this.limparPreview();
    }

    // Valida extensão e tamanho no front (a API valida de novo, inclusive a assinatura dos bytes).
    escolher(input: HTMLInputElement): void {
        const file = input.files?.[0];
        input.value = ''; // permite escolher o mesmo arquivo de novo
        if (!file || !this.eventoId) {
            return;
        }
        const regras = TIPO_ARQUIVO_EVENTO_REGRAS[this.tipo];
        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')).toLowerCase() : '';
        if (!regras.extensoes.includes(ext)) {
            this._snackBar.open(`Arquivo inválido. Use ${this.dica}.`, 'X', { duration: 6000 });
            return;
        }
        if (file.size > regras.maxBytes) {
            this._snackBar.open(`O arquivo tem mais de ${regras.maxRotulo}. Envie um menor.`, 'X', { duration: 6000 });
            return;
        }

        this.enviando = true;
        this._service.EnviarArquivo(this.eventoId, this.tipo, file).subscribe({
            next: item => {
                this.enviando = false;
                this.arquivoChange.emit(item);
                this._snackBar.open(`${this.rotulo} enviado.`, 'X', { duration: 4000 });
            },
            error: error => {
                this.enviando = false;
                // Acima do limite de requisição o servidor recusa (413) sem mensagem amigável.
                const padrao = error?.status === 413 ? `O arquivo é grande demais. Envie um de até ${regras.maxRotulo}.` : `Não foi possível enviar o arquivo.`;
                this._snackBar.open(mensagemErro(error, padrao), 'X', { duration: 6000 });
            },
        });
    }

    remover(): void {
        if (!this.arquivo || this.ocupado) {
            return;
        }
        const id = this.arquivo.Id;
        this._confirmacao.open({
            title: `Remover ${this.rotulo.toLowerCase()}`,
            message: `Remover o arquivo "${this.arquivo.EVA_NOME_ORIGINAL}"?`,
            icon: { show: true, name: 'heroicons_outline:trash', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Remover', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
            this.ocupado = true;
            this._service.ExcluirArquivo(id).subscribe({
                next: () => {
                    this.ocupado = false;
                    this.arquivoChange.emit(null);
                    this._snackBar.open('Arquivo removido.', 'X', { duration: 4000 });
                },
                error: error => {
                    this.ocupado = false;
                    this._snackBar.open(mensagemErro(error, 'Não foi possível remover o arquivo.'), 'X', { duration: 6000 });
                },
            });
        });
    }

    // Download autenticado: baixa o blob e dispara um <a download> temporário.
    baixar(): void {
        if (!this.arquivo || this.ocupado) {
            return;
        }
        const nome = this.arquivo.EVA_NOME_ORIGINAL;
        this.ocupado = true;
        this._service.BaixarArquivo(this.arquivo.Id).subscribe({
            next: blob => {
                this.ocupado = false;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nome;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            },
            error: async error => {
                this.ocupado = false;
                this._snackBar.open(await extrairMensagemErroBlob(error, 'Não foi possível baixar o arquivo.'), 'X', { duration: 6000 });
            },
        });
    }

    // Abre a imagem em tamanho maior numa nova guia.
    abrirImagem(): void {
        if (this.previewUrl) {
            window.open(this.previewUrl, '_blank', 'noopener');
        }
    }

    private carregarPreview(id: string): void {
        this.carregandoPreview = true;
        this.previewFalhou = false;
        this._service.BaixarArquivo(id).subscribe({
            next: blob => {
                // Chegou depois de trocar/remover o arquivo: descarta.
                if (this._previewDe !== id) {
                    return;
                }
                this.previewUrl = URL.createObjectURL(blob);
                this.carregandoPreview = false;
            },
            error: () => {
                if (this._previewDe === id) {
                    this.carregandoPreview = false;
                    this.previewFalhou = true;
                }
            },
        });
    }

    private limparPreview(): void {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = null;
        this.carregandoPreview = false;
        this.previewFalhou = false;
    }
}
