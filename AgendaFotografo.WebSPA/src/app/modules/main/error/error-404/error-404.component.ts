import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MascoteComponent } from 'app/shared/auth-shell/mascote.component';
import { QcAuthShellComponent } from 'app/shared/auth-shell/qc-auth-shell.component';

@Component({
    selector       : 'error-404',
    templateUrl    : './error-404.component.html',
    standalone: true,
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule, QcAuthShellComponent, MascoteComponent]
})
export class Error404Component
{
    /**
     * Constructor
     */
    constructor()
    {
    }
}
