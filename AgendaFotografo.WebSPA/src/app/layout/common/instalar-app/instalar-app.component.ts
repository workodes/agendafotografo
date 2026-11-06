import { NgIf } from '@angular/common';
import { Component, HostListener, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

type Plataforma = 'prompt' | 'ios-safari' | 'ios-outro' | 'generico';

/**
 * Faixa "Instale o app" do cabeçalho do assinante/admin: aparece em TODO acesso feito fora do app instalado
 * (navegador comum) e some quando o sistema já roda como app (display-mode standalone / iOS standalone).
 * "Agora não" só esconde até recarregar a página ou entrar de novo (nada é guardado: a ideia é lembrar sempre).
 */
@Component({
    selector: 'instalar-app',
    standalone: true,
    imports: [NgIf, MatButtonModule, MatIconModule],
    template: `
    <div *ngIf="visivel" class="print:hidden flex items-start gap-3 px-3 sm:px-6 py-3 bg-primary-50 border-b border-primary-200 text-primary-900" role="region" aria-label="Instalar o aplicativo">
        <mat-icon class="mt-0.5 shrink-0 text-primary-700" [svgIcon]="'heroicons_outline:device-phone-mobile'"></mat-icon>
        <div class="flex-auto min-w-0 text-sm">
            <div class="font-semibold">Use o FOKOPP como aplicativo</div>
            <ng-container>
                <div *ngIf="plataforma === 'prompt'">Fica na tela inicial do celular e abre em tela cheia, sem a barra do navegador.</div>
                <ol *ngIf="plataforma === 'ios-safari'" class="mt-1 list-decimal pl-5 space-y-0.5">
                    <li>Toque no botão <strong>Compartilhar</strong> (quadrado com seta para cima) na barra do Safari.</li>
                    <li>Escolha <strong>Adicionar à Tela de Início</strong>.</li>
                    <li>Toque em <strong>Adicionar</strong>. O ícone aparece junto dos seus apps.</li>
                </ol>
                <div *ngIf="plataforma === 'ios-outro'">No iPhone/iPad a instalação só funciona pelo <strong>Safari</strong>: abra este endereço nele, toque em Compartilhar e depois em <strong>Adicionar à Tela de Início</strong>.</div>
                <ol *ngIf="plataforma === 'generico'" class="mt-1 list-decimal pl-5 space-y-0.5">
                    <li>Abra o menu do navegador (<strong>&#8942;</strong>, três pontinhos).</li>
                    <li>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
                    <li>Confirme em <strong>Instalar</strong>.</li>
                </ol>
            </ng-container>
            <div class="mt-2 flex flex-wrap gap-2">
                <button *ngIf="plataforma === 'prompt'" mat-flat-button color="primary" type="button" (click)="instalar()">Instalar agora</button>
                <button mat-button type="button" (click)="dispensar()">Agora não</button>
            </div>
        </div>
        <button mat-icon-button type="button" class="shrink-0 -mt-1 -mr-1" aria-label="Fechar aviso" (click)="dispensar()">
            <mat-icon [svgIcon]="'heroicons_outline:x-mark'"></mat-icon>
        </button>
    </div>`,
})
export class InstalarAppComponent implements OnInit {
    visivel = false;
    plataforma: Plataforma = 'generico';
    private _evento: any = null;

    // Discreto: aparece no máximo uma vez por sessão do navegador (F5 não repete) e, depois de "Agora não"/X, some por 7 dias.
    private static readonly CHAVE_DISPENSA = 'instalarApp.dispensadoEm';
    private static readonly CHAVE_SESSAO = 'instalarApp.mostradoNaSessao';
    private static readonly DIAS_DISPENSA = 7;

    ngOnInit(): void {
        this._evento = (window as any).__pwaPrompt ?? null;
        this.plataforma = this._evento ? 'prompt' : this.detectar();
        this.mostrarSePuder();
    }

    dispensar(): void {
        this.visivel = false;
        try { localStorage.setItem(InstalarAppComponent.CHAVE_DISPENSA, String(Date.now())); } catch { }
    }

    private mostrarSePuder(): void {
        if (this.visivel || this.rodandoComoApp() || this.dispensadoRecente()) return;
        try {
            if (sessionStorage.getItem(InstalarAppComponent.CHAVE_SESSAO)) return;
            sessionStorage.setItem(InstalarAppComponent.CHAVE_SESSAO, '1');
        } catch { }
        this.visivel = true;
    }

    private dispensadoRecente(): boolean {
        try {
            const em = Number(localStorage.getItem(InstalarAppComponent.CHAVE_DISPENSA));
            return !!em && Date.now() - em < InstalarAppComponent.DIAS_DISPENSA * 24 * 60 * 60 * 1000;
        } catch { return false; }
    }

    @HostListener('window:beforeinstallprompt', ['$event'])
    aoPrompt(e: Event): void {
        e.preventDefault();
        this._evento = e;
        (window as any).__pwaPrompt = e;
        this.plataforma = 'prompt';
        this.mostrarSePuder();
    }

    @HostListener('window:appinstalled')
    aoInstalar(): void { this.visivel = false; (window as any).__pwaPrompt = null; }

    async instalar(): Promise<void> {
        const e = this._evento ?? (window as any).__pwaPrompt;
        if (!e) { this.plataforma = 'generico'; return; }
        try {
            await e.prompt();
            const r = await e.userChoice;
            if (r?.outcome === 'accepted') this.visivel = false;
        } catch { this.plataforma = 'generico'; }
        this._evento = null;
        (window as any).__pwaPrompt = null;
    }

    private rodandoComoApp(): boolean {
        try {
            return window.matchMedia('(display-mode: standalone)').matches
                || window.matchMedia('(display-mode: fullscreen)').matches
                || (navigator as any).standalone === true;
        } catch { return false; }
    }

    private detectar(): Plataforma {
        if (this._evento) return 'prompt';
        const ua = navigator.userAgent || '';
        const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (ios) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-outro' : 'ios-safari';
        return 'generico';
    }
}
