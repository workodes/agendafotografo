import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

let proximoId = 0;

/** Mascote do quemclica (SVG da landing). Decorativo: sempre aria-hidden. */
@Component({
    selector: 'app-mascote',
    standalone: true,
    templateUrl: './mascote.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { 'aria-hidden': 'true', style: 'display:inline-block;line-height:0' },
})
export class MascoteComponent {
    /** pequeno = só a cabeça (80 px); medio = corpo inteiro (160 px); grande = corpo inteiro (260 px). */
    @Input() tamanho: 'pequeno' | 'medio' | 'grande' = 'medio';

    readonly id = `mascote-${++proximoId}`;

    get largura(): number {
        return this.tamanho === 'pequeno' ? 72 : this.tamanho === 'medio' ? 150 : 260;
    }
}
