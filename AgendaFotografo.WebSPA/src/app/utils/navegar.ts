import { ActivatedRoute, Router } from '@angular/router';

/**
 * Abre uma rota filha (ficha) a partir da linha de uma listagem. Clique normal navega na mesma guia;
 * Ctrl/Cmd+clique e clique do meio abrem a mesma URL em NOVA guia (a ficha tem rota própria).
 */
export function abrirRota(router: Router, route: ActivatedRoute, comandos: unknown[], event?: MouseEvent): void {
    if (event) {
        if (event.type === 'auxclick' && event.button !== 1) {
            return; // botão direito etc.
        }
        if (event.ctrlKey || event.metaKey || event.button === 1) {
            event.preventDefault();
            const url = router.serializeUrl(router.createUrlTree(comandos, { relativeTo: route }));
            window.open(url, '_blank', 'noopener');
            return;
        }
    }
    router.navigate(comandos, { relativeTo: route });
}
