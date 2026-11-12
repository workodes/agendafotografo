import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MascoteComponent } from './mascote.component';

/**
 * Casca das telas públicas (login, logout, erros): fundo creme, cartão central, logo,
 * título (h1 único), subtítulo e conteúdo projetado.
 * Variante layout="dividido" (login): a partir de md, arte (logo, título grande, mascote, nota, widget) à esquerda e cartão à direita;
 * abaixo de md, bloco próprio: logo, nota à mão e o mascote médio ao lado, em pé na borda do cartão (sem widget; o h1 fica só para leitores de tela).
 * Nesse layout o h1 é o título da arte (um por largura; o outro fica display:none) e o `titulo` do cartão vira h2.
 * Nunca mostrar o mascote só-cabeça ('pequeno') perto da logo: por isso mostrarMascote é false por padrão.
 * Uso: <app-qc-auth-shell titulo="Entrar" subtitulo="...">...</app-qc-auth-shell>
 */
@Component({
    selector: 'app-qc-auth-shell',
    standalone: true,
    imports: [MascoteComponent, NgTemplateOutlet],
    templateUrl: './qc-auth-shell.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // A tela da rota é um flex em linha (layout.component.scss); sem isto o shell encolhe ao tamanho do cartão.
    host: { class: 'flex flex-auto w-full min-w-0' },
})
export class QcAuthShellComponent {
    @Input() titulo = '';
    @Input() subtitulo = '';
    /** Mascote só-cabeça acima do título (layout cartão). Evitar junto da logo. */
    @Input() mostrarMascote = false;
    /** Logo no topo do cartão (layout cartão). false nas telas que já mostram o mascote no conteúdo (saída e erros), para não repetir a marca. */
    @Input() mostrarLogo = true;
    @Input() layout: 'cartao' | 'dividido' = 'cartao';
    /** Layout dividido: título grande (h1), palavra em destaque com rabisco, nota à mão e widget. */
    @Input() tituloArte = '';
    @Input() destaqueArte = '';
    @Input() notaArte = '';
    @Input() widgetArte = '';
    @Input() widgetDetalheArte = '';
}
