import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Progresso das pendências de um evento: "N de T pendências feitas" com barra fina.
 * abertas/total vêm da API (total não conta Ignoradas; evento cancelado vem 0 e 0). Sem total, não renderiza.
 */
@Component({
    selector: 'app-progresso-pendencias',
    standalone: true,
    imports: [MatIconModule, MatTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (total > 0) {
            <div class="min-w-0" [matTooltip]="percentual + '% das pendências feitas'">
                <div class="flex items-center gap-1 text-secondary" [class.text-xs]="compacto" [class.text-sm]="!compacto">
                    @if (todasFeitas) {
                        <mat-icon class="icon-size-4 text-green-600" svgIcon="heroicons_solid:check-circle"></mat-icon>
                        <span class="truncate font-medium">Todas feitas</span>
                    } @else {
                        <span class="truncate">{{ feitas }} de {{ total }} pendências feitas</span>
                    }
                </div>
                <div
                    class="mt-1 w-full overflow-hidden rounded-full bg-gray-200"
                    [class.h-1]="compacto"
                    [class.h-1.5]="!compacto"
                    role="progressbar"
                    aria-label="Pendências feitas"
                    aria-valuemin="0"
                    [attr.aria-valuemax]="total"
                    [attr.aria-valuenow]="feitas"
                    [attr.aria-valuetext]="feitas + ' de ' + total + ' pendências feitas'">
                    <div
                        class="h-full rounded-full"
                        [class.bg-primary-500]="!todasFeitas"
                        [class.bg-green-600]="todasFeitas"
                        [style.width.%]="percentual"></div>
                </div>
            </div>
        }
    `,
})
export class ProgressoPendenciasComponent {
    @Input() abertas: number = 0;
    @Input() total: number = 0;
    @Input() compacto: boolean = false;

    get feitas(): number {
        return Math.max(0, this.total - this.abertas);
    }

    get todasFeitas(): boolean {
        return this.total > 0 && this.abertas === 0;
    }

    get percentual(): number {
        return this.total > 0 ? Math.round((this.feitas / this.total) * 100) : 0;
    }
}
