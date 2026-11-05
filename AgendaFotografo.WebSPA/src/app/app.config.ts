import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, NativeDateAdapter, provideNativeDateAdapter } from '@angular/material/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideFuse } from '@fuse';
import { appRoutes } from 'app/app.routes';
import { provideAuth } from 'app/core/auth/auth.provider';
import { provideIcons } from 'app/core/icons/icons.provider';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
    providers: [
        provideNativeDateAdapter(),
        {
            provide: LOCALE_ID,
            useValue: 'pt-BR',
        },
        {
            provide: MAT_DATE_LOCALE,
            useValue: 'pt-BR',
        },
        {
            provide: DateAdapter,
            useClass: NativeDateAdapter,
        },
        {
            provide: MAT_DATE_FORMATS,
            useValue: {
                parse: {
                    dateInput: 'dd/MM/yyyy',
                },
                display: {
                    dateInput: 'dd/MM/yyyy',
                    monthYearLabel: 'MMM yyyy',
                    dateA11yLabel: 'dd/MM/yyyy',
                    monthYearA11yLabel: 'MMMM yyyy',
                },
            },
        },

        provideAnimations(),
        provideHttpClient(),
        provideRouter(appRoutes,
            withPreloading(PreloadAllModules),
            withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
        ),

        // Fuse
        provideAuth(),
        provideIcons(),
        provideFuse({
            fuse: {
                layout: 'modern',
                scheme: 'light',
                screens: {
                    sm: '600px',
                    md: '960px',
                    lg: '1280px',
                    xl: '1440px',
                },
                theme: 'theme-sistema',
                themes: [
                    {
                        id: 'theme-default',
                        name: 'Default',
                    },
                    {
                        id: 'theme-sistema',
                        name: 'Sistema',
                    },
                    // {
                    //     id  : 'theme-brand',
                    //     name: 'Brand',
                    // },
                    // {
                    //     id  : 'theme-teal',
                    //     name: 'Teal',
                    // },
                    // {
                    //     id  : 'theme-rose',
                    //     name: 'Rose',
                    // },
                    // {
                    //     id  : 'theme-purple',
                    //     name: 'Purple',
                    // },
                    // {
                    //     id  : 'theme-amber',
                    //     name: 'Amber',
                    // },
                ],
            },
        }),
    ],
};
