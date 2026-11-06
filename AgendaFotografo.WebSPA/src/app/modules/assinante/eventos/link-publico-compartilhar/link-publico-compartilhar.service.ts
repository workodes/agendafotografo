import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { filter } from 'rxjs';
import { EventoService } from 'app/services/evento.service';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { LinkCopiadoDialogComponent, LinkCopiadoDialogData } from './link-copiado-dialog.component';

export interface EventoParaLink {
    id: string;
    nome: string;
    data: string;
}

// Fluxo do botão de link na ficha, na Agenda e na Visão do dia: sem link, oferece criar; com link, abre o modal
// com o código e o texto pronto (Copiar texto / WhatsApp). O código vive só em memória, dentro do modal.
@Injectable({ providedIn: 'root' })
export class LinkPublicoCompartilharService {
    constructor(
        private _service: EventoService,
        private _dialog: MatDialog,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
    ) { }

    Abrir(evento: EventoParaLink): void {
        this._service.Link(evento.id).subscribe({
            next: link => {
                if (link.Configurado) {
                    this.abrirModal(evento, link);
                    return;
                }
                this._confirmacao.open({
                    title: 'Link público',
                    message: 'Este evento ainda não tem link público. Criar agora?',
                    icon: { show: true, name: 'heroicons_outline:link', color: 'primary' },
                    actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Criar link', color: 'primary' } },
                    dismissible: true,
                }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(() => {
                    this._service.AtualizarLink(evento.id, { EVL_ATIVO: true, EVL_MOSTRAR_EQUIPE: false }).subscribe({
                        next: criado => this.abrirModal(evento, criado),
                        error: error => this._snackBar.open(mensagemErro(error, 'Não foi possível criar o link.'), 'X', { duration: 6000 }),
                    });
                });
            },
            error: error => this._snackBar.open(mensagemErro(error, 'Não foi possível carregar o link do evento.'), 'X', { duration: 6000 }),
        });
    }

    // Abre o modal com um link já carregado (usado pela Abrir e pela seção da ficha).
    abrirModal(evento: EventoParaLink, link: LinkCopiadoDialogData['link'], aoFechar?: (link: LinkCopiadoDialogData['link']) => void): void {
        const dados: LinkCopiadoDialogData = { evento, link: { ...link } };
        this._dialog.open(LinkCopiadoDialogComponent, {
            width: '440px',
            maxWidth: '95vw',
            autoFocus: false,
            data: dados,
        }).afterClosed().subscribe(() => {
            // Apaga o código da memória ao fechar.
            dados.link = { ...dados.link, Codigo: null };
            aoFechar?.(dados.link);
        });
    }
}
