import { NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, QueryList, ViewChildren } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TipoAssinante } from 'app/models/enums/TipoAssinante';

interface OpcaoPerfil {
    valor: TipoAssinante;
    titulo: string;
    descricao: string;
}

/**
 * Escolha do perfil no cadastro (plano 20): "Coordeno uma equipe" | "Sou fotógrafo".
 * Obrigatória e sem padrão. Dois cartões num `radiogroup` acessível por teclado
 * (Tab entra no grupo; setas movem e marcam; Espaço/Enter marcam).
 */
@Component({
    selector: 'app-escolha-perfil',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgFor, NgIf, MatIconModule],
    template: `
        <div role="radiogroup" [attr.aria-labelledby]="idRotulo" [attr.aria-describedby]="mostrarErro ? idErro : null"
            [attr.aria-invalid]="mostrarErro" [attr.aria-required]="true" class="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
            <button #cartao *ngFor="let o of opcoes; let i = index" type="button" role="radio"
                [attr.aria-checked]="valor === o.valor" [attr.tabindex]="indiceFocavel === i ? 0 : -1"
                class="relative flex min-h-[72px] w-full flex-col items-start justify-center rounded-xl border-2 px-3 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#431407]"
                [class]="valor === o.valor
                    ? 'border-[#c2410c] bg-[#c2410c] text-white'
                    : (mostrarErro ? 'border-red-700 bg-white text-[#431407]' : 'border-[#d6cfc9] bg-white text-[#431407] hover:border-[#c2410c]')"
                (click)="escolher(o.valor)" (keydown)="aoTeclar($event, i)">
                <mat-icon *ngIf="valor === o.valor" class="icon-size-5 absolute right-2 top-2 text-white" [svgIcon]="'heroicons_solid:check-circle'"></mat-icon>
                <span class="pr-6 text-sm font-bold">{{ o.titulo }}</span>
                <span class="mt-0.5 text-xs" [class]="valor === o.valor ? 'text-white' : 'text-[#57534e]'">{{ o.descricao }}</span>
            </button>
        </div>
        <div *ngIf="mostrarErro" [id]="idErro" class="qc-erro" role="alert">
            <mat-icon class="icon-size-5 shrink-0" [svgIcon]="'heroicons_solid:exclamation-circle'"></mat-icon>
            <span>Escolha como você vai usar o quemclica.</span>
        </div>
    `,
})
export class EscolhaPerfilComponent {
    @Input() valor: TipoAssinante | null = null;
    @Input() mostrarErro = false;
    /** id do rótulo que descreve o grupo (aria-labelledby). */
    @Input() idRotulo = '';
    @Input() idErro = 'escolha-perfil-erro';
    @Output() valorChange = new EventEmitter<TipoAssinante>();
    @ViewChildren('cartao') cartoes: QueryList<ElementRef<HTMLButtonElement>>;

    readonly opcoes: OpcaoPerfil[] = [
        { valor: TipoAssinante.Coordenador, titulo: 'Coordeno uma equipe', descricao: 'Escalo fotógrafos nos eventos' },
        { valor: TipoAssinante.Fotografo, titulo: 'Sou fotógrafo', descricao: 'Minha agenda de eventos' },
    ];

    /** Sem escolha, só o primeiro cartão entra na ordem do Tab. */
    get indiceFocavel(): number {
        const i = this.opcoes.findIndex(o => o.valor === this.valor);
        return i < 0 ? 0 : i;
    }

    escolher(valor: TipoAssinante): void {
        if (valor !== this.valor)
            this.valorChange.emit(valor);
    }

    aoTeclar(evento: KeyboardEvent, indice: number): void {
        const passo = ['ArrowRight', 'ArrowDown'].includes(evento.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(evento.key) ? -1 : 0;
        if (!passo)
            return;
        evento.preventDefault();
        const destino = (indice + passo + this.opcoes.length) % this.opcoes.length;
        this.escolher(this.opcoes[destino].valor);
        this.cartoes.get(destino)?.nativeElement.focus();
    }
}
