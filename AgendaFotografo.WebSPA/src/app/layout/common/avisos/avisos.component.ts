import { InstalarAppComponent, instalarAppPendente, marcarInstalarAppVisto } from 'app/layout/common/instalar-app/instalar-app.component';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { MatButton, MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AvisoItem } from 'app/models/DTOs/responses/AvisoItem';
import { AvisosResponse } from 'app/models/DTOs/responses/AvisosResponse';
import { GravidadeAviso } from 'app/models/enums/GravidadeAviso';
import { AvisoItemComponent } from 'app/modules/shared/components/aviso-item/aviso-item.component';
import { AvisoService } from 'app/services/aviso.service';
import { EventoService } from 'app/services/evento.service';
import { debounceTime, merge, Subject, takeUntil, timer } from 'rxjs';

/** Atualização automática do sino: a cada 5 minutos (além de ao entrar, ao abrir o painel e após `EventoService.alterado$`). */
const INTERVALO_MS = 5 * 60 * 1000;
const TETO_CONTADOR = 99;

// Sino de avisos do cabeçalho (só Assinante). Adaptado do `notifications` do Fuse: painel via Overlay/TemplatePortal, em tela cheia no celular.
// Os avisos vêm prontos da API; aqui não há "lido/não lido" nem recálculo de regra.
@Component({
    selector: 'avisos',
    templateUrl: './avisos.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [NgClass, NgFor, NgIf, MatButtonModule, MatIconModule, AvisoItemComponent, InstalarAppComponent],
})
export class AvisosComponent implements OnInit, OnDestroy {
    @ViewChild('avisosOrigin') private _origem: MatButton;
    @ViewChild('avisosPanel') private _painel: TemplateRef<unknown>;

    avisos: AvisosResponse | null = null;
    carregando = false;
    falhou = false;
    private _overlayRef: OverlayRef;
    private readonly _unsubscribeAll = new Subject<void>();

    constructor(
        private _avisoService: AvisoService,
        private _eventoService: EventoService,
        private _overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        private _changeDetectorRef: ChangeDetectorRef,
    ) { }

    // Convite para instalar o app: soma 1 no sino até a primeira abertura do painel.
    instalarPendente = instalarAppPendente();

    /** Texto do contador: o `Total` da API (+1 do convite do app pendente), "99+" no teto; vazio quando não há avisos. */
    get contador(): string {
        const total = (this.avisos?.Total ?? 0) + (this.instalarPendente ? 1 : 0);
        return total > TETO_CONTADOR ? `${TETO_CONTADOR}+` : total > 0 ? String(total) : '';
    }

    get temCritico(): boolean {
        return (this.avisos?.Criticos ?? 0) > 0;
    }

    get criticos(): AvisoItem[] {
        return (this.avisos?.Itens ?? []).filter(a => a.Gravidade === GravidadeAviso.Critico);
    }

    get atencao(): AvisoItem[] {
        return (this.avisos?.Itens ?? []).filter(a => a.Gravidade !== GravidadeAviso.Critico);
    }

    /** Total real maior do que os itens devolvidos (a API limita a 30). */
    get restantes(): number {
        return Math.max(0, (this.avisos?.Total ?? 0) - (this.avisos?.Itens?.length ?? 0));
    }

    get rotuloBotao(): string {
        const total = this.avisos?.Total ?? 0;
        return total > 0 ? `Avisos: ${total} ${total === 1 ? 'situação pede' : 'situações pedem'} atenção` : 'Avisos';
    }

    ngOnInit(): void {
        this._avisoService.avisos$.pipe(takeUntil(this._unsubscribeAll)).subscribe(avisos => {
            this.avisos = avisos;
            this._changeDetectorRef.markForCheck();
        });

        this._avisoService.carregando$.pipe(takeUntil(this._unsubscribeAll)).subscribe(carregando => {
            this.carregando = carregando;
            this._changeDetectorRef.markForCheck();
        });
        this._avisoService.falhou$.pipe(takeUntil(this._unsubscribeAll)).subscribe(falhou => {
            this.falhou = falhou;
            this._changeDetectorRef.markForCheck();
        });

        // Ao entrar (timer em 0), a cada 5 minutos e depois de qualquer alteração de evento/escala/pendência. Falha silenciosa (o serviço mantém os últimos avisos bons).
        merge(timer(0, INTERVALO_MS), this._eventoService.alterado$.pipe(debounceTime(300)))
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(() => this._avisoService.Carregar());
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next();
        this._unsubscribeAll.complete();
        this._overlayRef?.dispose();
        this._avisoService.Limpar();
    }

    abrirPainel(): void {
        if (!this._painel || !this._origem) {
            return;
        }
        if (!this._overlayRef) {
            this._criarOverlay();
        }
        this._overlayRef.attach(new TemplatePortal(this._painel, this._viewContainerRef));
        this._avisoService.Carregar(); // atualiza ao abrir
        if (this.instalarPendente) {
            marcarInstalarAppVisto();
            this.instalarPendente = false;
        }
    }

    fecharPainel(): void {
        this._overlayRef?.detach();
    }

    trackByChave(_: number, aviso: AvisoItem): string {
        return aviso.Chave;
    }

    private _criarOverlay(): void {
        this._overlayRef = this._overlay.create({
            hasBackdrop: true,
            backdropClass: 'fuse-backdrop-on-mobile',
            scrollStrategy: this._overlay.scrollStrategies.block(),
            positionStrategy: this._overlay.position()
                .flexibleConnectedTo(this._origem._elementRef.nativeElement)
                .withLockedPosition(true)
                .withPush(true)
                .withPositions([
                    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
                    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
                    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
                    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
                ]),
        });
        this._overlayRef.backdropClick().subscribe(() => this._overlayRef.detach());
        this._overlayRef.keydownEvents().subscribe(e => {
            if (e.key === 'Escape') {
                this._overlayRef.detach();
            }
        });
    }
}
