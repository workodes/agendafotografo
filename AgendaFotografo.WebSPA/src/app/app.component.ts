import { Component, LOCALE_ID } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
    selector   : 'app-root',
    templateUrl: './app.component.html',
    styleUrls  : ['./app.component.scss'],
    standalone : true,
    imports    : [RouterOutlet],
    providers: [
        { provide: LOCALE_ID, useValue: 'pt-BR' }
    ]
})
export class AppComponent
{
    constructor()
    {
    }
}
