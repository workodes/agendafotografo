import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/**
 * Painel lateral de filtros (cabeçalho, corpo e rodapé Limpar/Aplicar), 360px à direita, com backdrop e slide.
 * NÃO é um `mat-drawer`: o Material só admite um drawer por lado no container e a ficha já usa `position="end"`.
 * Usar como filho direto do contêiner `absolute inset-0` da listagem (irmão do `mat-drawer-container`), controlado
 * por `[aberto]`; fechar (X, backdrop, ESC) emite `fechar`. Os campos entram por projeção.
 * Ao abrir, o foco vai para o painel; ao fechar, volta ao elemento que o tinha (botão de filtro).
 */
@Component({
    standalone: true,
    selector: 'app-filtro-painel',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
    host: { class: 'absolute inset-0 z-10 overflow-hidden', '[class.pointer-events-none]': '!aberto' },
    styles: [`
        .filtro-backdrop { background: rgba(0, 0, 0, .32); opacity: 0; transition: opacity 250ms ease; }
        .filtro-lateral { transform: translateX(100%); visibility: hidden; outline: none;
            transition: transform 250ms ease, visibility 0s linear 250ms; }
        .aberto .filtro-backdrop { opacity: 1; }
        .aberto .filtro-lateral { transform: translateX(0); visibility: visible; transition-delay: 0s; }
    `],
    template: `
        <div class="absolute inset-0" [class.aberto]="aberto">
            <div class="filtro-backdrop absolute inset-0" (click)="fechar.emit()"></div>
            <div #lateral class="filtro-lateral filtro-painel bg-card absolute top-0 right-0 bottom-0 flex flex-col w-full sm:w-[360px] shadow-2xl"
                [style.background-color]="fundo || null" tabindex="-1" role="dialog" aria-label="Filtros" [attr.inert]="aberto ? null : ''">
                <div class="flex items-center justify-between p-5 pb-3">
                    <div class="text-2xl font-bold">Filtros</div>
                    <button mat-icon-button type="button" aria-label="Fechar" (click)="fechar.emit()">
                        <mat-icon svgIcon="heroicons_outline:x-mark"></mat-icon>
                    </button>
                </div>
                <div class="flex-auto overflow-y-auto px-5">
                    <div class="flex flex-col gap-3 pt-1">
                        <ng-content></ng-content>
                    </div>
                </div>
                <div class="flex items-center justify-end gap-3 p-5">
                    <button mat-stroked-button type="button" (click)="limpar.emit()">Limpar filtros</button>
                    <button mat-flat-button color="primary" type="button" (click)="aplicar.emit()">Aplicar</button>
                </div>
            </div>
        </div>
    `,
})
export class FiltroPainelComponent implements OnChanges, OnDestroy {
    @Input() aberto = false;
    /** Fundo opcional do painel (cor CSS). Sem valor, vale o fundo do tema (`bg-card`). */
    @Input() fundo?: string;
    @Output() aplicar = new EventEmitter<void>();
    @Output() limpar = new EventEmitter<void>();
    @Output() fechar = new EventEmitter<void>();

    @ViewChild('lateral', { static: true }) lateral!: ElementRef<HTMLElement>;
    private _anterior: HTMLElement | null = null;
    private _timerFoco?: ReturnType<typeof setTimeout>;

    // O ESC é tratado pela diretiva `appFecharComEsc` da listagem (documento, fase de captura).

    ngOnChanges(changes: SimpleChanges): void {
        const c = changes['aberto'];
        if (!c || c.firstChange) {
            return;
        }
        // Um foco agendado pela abertura nunca pode disparar depois de um fechar (ou da destruição).
        this.cancelarFoco();
        if (this.aberto) {
            this._anterior = document.activeElement as HTMLElement | null;
            this._timerFoco = setTimeout(() => {
                this._timerFoco = undefined;
                if (this.aberto) {
                    this.lateral.nativeElement.focus();
                }
            });
        } else {
            const painel = this.lateral.nativeElement;
            const foco = document.activeElement;
            // Só devolve o foco se ele ainda estava no painel (ou perdido); não rouba o foco da ficha que abre em seguida.
            if (!foco || foco === document.body || painel.contains(foco)) {
                const alvo = this._anterior && document.contains(this._anterior) ? this._anterior : document.body;
                alvo.focus();
            }
            this._anterior = null;
        }
    }

    ngOnDestroy(): void {
        this.cancelarFoco();
    }

    private cancelarFoco(): void {
        if (this._timerFoco !== undefined) {
            clearTimeout(this._timerFoco);
            this._timerFoco = undefined;
        }
    }
}
