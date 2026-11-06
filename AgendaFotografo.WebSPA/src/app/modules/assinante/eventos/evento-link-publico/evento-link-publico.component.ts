import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { Observable, filter } from 'rxjs';
import { EventoLinkItem } from 'app/models/DTOs/responses/EventoLinkItem';
import { EventoService } from 'app/services/evento.service';
import { copiarTexto } from 'app/utils/copiar-texto';
import { textoWhatsApp, urlPublica, urlWhatsApp } from 'app/utils/link-publico';
import { mensagemErro } from 'app/utils/mensagem-erro';
import { LinkPublicoCompartilharService } from '../link-publico-compartilhar/link-publico-compartilhar.service';

// Seção "Link público" da ficha do evento (fora do <form>). Em `novo` fica desabilitada. O código recebido da API
// fica só nesta propriedade em memória (nunca em storage, console, rota ou URL) e só aparece no modal.
@Component({
    standalone: true,
    selector: 'app-evento-link-publico',
    templateUrl: './evento-link-publico.component.html',
    imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSlideToggleModule],
})
export class EventoLinkPublicoComponent implements OnChanges {
    @Input() eventoId?: string | null;
    @Input() nome = '';
    @Input() data = '';

    // Avisa a ficha (selo da navegação lateral) a cada carga ou alteração; nulo = ainda sem dados.
    @Output() linkChange = new EventEmitter<EventoLinkItem | null>();

    private _link: EventoLinkItem | null = null;
    get link(): EventoLinkItem | null { return this._link; }
    set link(valor: EventoLinkItem | null) {
        this._link = valor;
        this.linkChange.emit(valor);
    }
    carregando = false;
    ocupado = false;
    erroCarga = false;
    private _carregadoDe?: string;

    constructor(
        private _service: EventoService,
        private _compartilhar: LinkPublicoCompartilharService,
        private _confirmacao: FuseConfirmationService,
        private _snackBar: MatSnackBar,
    ) { }

    get url(): string {
        return this.link?.EVL_TOKEN ? urlPublica(this.link.EVL_TOKEN) : '';
    }

    private get texto(): string {
        return this.link?.EVL_TOKEN && this.link.Codigo ? textoWhatsApp(this.nome, this.data, this.link.EVL_TOKEN, this.link.Codigo) : '';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['eventoId'] && this.eventoId !== this._carregadoDe) {
            this._carregadoDe = this.eventoId ?? undefined;
            this._link = null; // sem emitir: a ficha zera o selo ao trocar de evento
            if (this.eventoId) {
                this.carregar();
            }
        }
    }

    carregar(): void {
        if (!this.eventoId) {
            return;
        }
        this.carregando = true;
        this.erroCarga = false;
        this._service.Link(this.eventoId).subscribe({
            next: link => { this.carregando = false; this.link = link; },
            error: () => { this.carregando = false; this.erroCarga = true; },
        });
    }

    criar(): void {
        this.aplicar(this._service.AtualizarLink(this.eventoId!, { EVL_ATIVO: true, EVL_MOSTRAR_EQUIPE: false }), 'Link público criado.');
    }

    alternarAtivo(ativo: boolean): void {
        this.aplicar(this._service.AtualizarLink(this.eventoId!, { EVL_ATIVO: ativo, EVL_MOSTRAR_EQUIPE: !!this.link?.EVL_MOSTRAR_EQUIPE }),
            ativo ? 'Link ativado.' : 'Link desativado.');
    }

    alternarEquipe(mostrar: boolean): void {
        this.aplicar(this._service.AtualizarLink(this.eventoId!, { EVL_ATIVO: !!this.link?.EVL_ATIVO, EVL_MOSTRAR_EQUIPE: mostrar }),
            mostrar ? 'A equipe aparece no link.' : 'A equipe não aparece no link.');
    }

    // Copiar e WhatsApp agem direto no clique e depois abrem o modal com o código.
    copiar(): void {
        if (!this.texto) {
            return;
        }
        copiarTexto(this.texto).then(ok => this._snackBar.open(
            ok ? 'Texto copiado.' : 'Não foi possível copiar. Selecione e copie manualmente.', 'X', { duration: ok ? 3000 : 5000 }));
        this.abrirModal();
    }

    whatsapp(): void {
        if (!this.texto) {
            return;
        }
        window.open(urlWhatsApp(this.texto), '_blank', 'noopener');
        this.abrirModal();
    }

    novoCodigo(): void {
        this.confirmar('Gerar novo código',
            'O código atual deixa de valer e quem já entrou no link precisará digitar o novo código. O endereço continua o mesmo. Gerar novo código?',
            () => this.aplicar(this._service.RegerarCodigoLink(this.eventoId!), 'Novo código gerado.'));
    }

    novoLink(): void {
        this.confirmar('Gerar novo link',
            'O endereço atual e o código deixam de valer: quem tiver o link antigo verá "Link indisponível". Gerar novo link?',
            () => this.aplicar(this._service.RegerarLink(this.eventoId!), 'Novo link gerado.'));
    }

    private abrirModal(): void {
        if (this.link) {
            this._compartilhar.abrirModal({ id: this.eventoId!, nome: this.nome, data: this.data }, this.link, atualizado => { this.link = atualizado; });
        }
    }

    private confirmar(titulo: string, mensagem: string, acao: () => void): void {
        this._confirmacao.open({
            title: titulo,
            message: mensagem,
            icon: { show: true, name: 'heroicons_outline:exclamation-triangle', color: 'warn' },
            actions: { cancel: { label: 'Cancelar' }, confirm: { label: 'Gerar', color: 'warn' } },
            dismissible: true,
        }).afterClosed().pipe(filter(r => r === 'confirmed')).subscribe(acao);
    }

    private aplicar(chamada: Observable<EventoLinkItem>, sucesso: string): void {
        if (!this.eventoId || this.ocupado) {
            return;
        }
        this.ocupado = true;
        chamada.subscribe({
            next: link => {
                this.ocupado = false;
                this.link = link;
                this._snackBar.open(sucesso, 'X', { duration: 3000 });
            },
            error: error => {
                this.ocupado = false;
                this._snackBar.open(mensagemErro(error, 'Não foi possível atualizar o link público.'), 'X', { duration: 6000 });
            },
        });
    }
}
