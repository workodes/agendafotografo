import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MascoteComponent } from 'app/shared/auth-shell/mascote.component';
import { QcAuthShellComponent } from 'app/shared/auth-shell/qc-auth-shell.component';

@Component({
    selector       : 'error-500',
    templateUrl    : './error-500.component.html',
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone     : true,
    imports        : [RouterLink, QcAuthShellComponent, MascoteComponent],
})
export class Error500Component
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}
