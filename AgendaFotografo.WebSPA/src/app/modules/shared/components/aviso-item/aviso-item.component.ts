import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AvisoItem } from 'app/models/DTOs/responses/AvisoItem';
import { GravidadeAviso } from 'app/models/enums/GravidadeAviso';
import { destinoAviso, DestinoAviso, iconeAviso } from 'app/utils/aviso';

// Um aviso (ícone, título, descrição e Detalhes) como link para o destino. Usado no sino do cabeçalho e no Início do assinante.
@Component({
    selector: 'app-aviso-item',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, NgFor, NgIf, MatIconModule, RouterLink],
    template: `
        <a class="flex items-start gap-3 px-4 py-3 min-w-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-black dark:hover:bg-opacity-5"
           [routerLink]="destino.comandos" [queryParams]="destino.queryParams" (click)="selecionado.emit(aviso)">
            <div class="flex shrink-0 items-center justify-center w-9 h-9 rounded-full"
                 [ngClass]="critico ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'">
                <mat-icon class="icon-size-5 text-current" [svgIcon]="icone"></mat-icon>
            </div>
            <div class="flex flex-col flex-auto min-w-0">
                <div class="font-semibold break-words">{{ aviso.Titulo }}</div>
                <div *ngIf="aviso.Descricao" class="text-secondary break-words">{{ aviso.Descricao }}</div>
                <ul *ngIf="aviso.Detalhes?.length" class="mt-1 flex flex-wrap gap-1 list-none p-0 m-0">
                    <li *ngFor="let detalhe of aviso.Detalhes"
                        class="px-2 py-0.5 rounded-full text-xs leading-5"
                        [ngClass]="critico ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'">{{ detalhe }}</li>
                </ul>
            </div>
        </a>
    `,
})
export class AvisoItemComponent {
    @Input({ required: true }) aviso: AvisoItem;
    /** Emite ao clicar (o sino usa para fechar o painel). */
    @Output() selecionado = new EventEmitter<AvisoItem>();

    get critico(): boolean {
        return this.aviso.Gravidade === GravidadeAviso.Critico;
    }

    get icone(): string {
        return iconeAviso(this.aviso);
    }

    get destino(): DestinoAviso {
        return destinoAviso(this.aviso);
    }
}
