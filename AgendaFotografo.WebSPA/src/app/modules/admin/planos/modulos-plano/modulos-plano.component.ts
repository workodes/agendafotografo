import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModuloCatalogoItem } from 'app/models/DTOs/responses/ModulosCatalogo';
import { MODULO_PLANO_ICONE } from 'app/models/enums/ModuloPlano';

// "Módulos liberados neste plano" (plano 24, desenho do AgroGestor): um cartão por módulo do catálogo da API, com o
// mat-slide-toggle; não liberado fica em cinza com cadeado. "Marcar todos" / "Limpar" e o selo "N de M liberados".
// Embaixo, o bloco fixo "Sempre liberados" (só texto). Componente de apresentação: quem guarda a seleção é a ficha.
@Component({
    standalone: true,
    selector: 'app-modulos-plano',
    templateUrl: './modulos-plano.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, MatButtonModule, MatIconModule, MatSlideToggleModule],
})
export class ModulosPlanoComponent {
    @Input() catalogo: ModuloCatalogoItem[] = [];
    @Input() sempreLiberados: string[] = [];
    @Input() selecionados: number[] = [];
    @Input() desabilitado = false;
    @Output() selecionadosChange = new EventEmitter<number[]>();

    get totalLiberados(): number {
        return this.catalogo.filter(m => this.liberado(m.Modulo)).length;
    }

    liberado(modulo: number): boolean {
        return this.selecionados.includes(modulo);
    }

    icone(modulo: number): string {
        return MODULO_PLANO_ICONE[modulo] ?? 'heroicons_outline:squares-2x2';
    }

    alternar(modulo: number, ligado: boolean): void {
        const atual = new Set(this.selecionados);
        if (ligado) {
            atual.add(modulo);
        } else {
            atual.delete(modulo);
        }
        this.emitir([...atual]);
    }

    marcarTodos(): void {
        this.emitir(this.catalogo.map(m => m.Modulo));
    }

    limpar(): void {
        this.emitir([]);
    }

    trackModulo(_: number, m: ModuloCatalogoItem): number {
        return m.Modulo;
    }

    private emitir(lista: number[]): void {
        this.selecionadosChange.emit([...lista].sort((a, b) => a - b));
    }
}
