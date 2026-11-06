import { Component, Input } from '@angular/core';

/**
 * Cabeçalho das telas de cadastro no padrão Fuse: título, contador em pílula e área de projeção (busca e botões).
 */
@Component({
    selector: 'app-pagina-cabecalho',
    standalone: true,
    host: { class: 'block shrink-0' },
    template: `
        <div class="flex flex-col items-start gap-4 border-b bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 md:px-8">
            <div class="flex min-w-0 flex-col gap-1">
            <div class="flex min-w-0 items-center gap-3">
                <h1 class="text-3xl font-extrabold leading-none tracking-tight sm:text-4xl">{{ titulo }}</h1>
                @if (contador !== null && contador !== undefined) {
                    <div
                        class="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-300 px-2 text-sm font-semibold text-secondary"
                        aria-label="Total de registros">
                        {{ contador }}
                    </div>
                }
            </div>
            @if (subtitulo) {
                <div class="text-sm text-secondary">{{ subtitulo }}</div>
            }
            </div>
            <ng-content></ng-content>
        </div>
    `,
})
export class PaginaCabecalhoComponent {
    @Input() titulo: string = '';
    @Input() subtitulo: string = '';
    @Input() contador: number | null | undefined = null;
}
