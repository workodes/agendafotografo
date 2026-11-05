import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {Router, RouterLink, RouterModule} from '@angular/router';

@Component({
    selector       : 'error-404',
    templateUrl    : './error-404.component.html',
    standalone: true,
    encapsulation  : ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterModule]
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
