import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PreloadAllModules, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideFuse } from '@fuse';
import { appRoutes } from 'app/app.routes';
import { provideAuth } from 'app/core/auth/auth.provider';
import { provideIcons } from 'app/core/icons/icons.provider';
import { CustomDateAdapter, FORMATOS_DATA_PTBR } from 'app/utils/custom-date-adapter';
import { DatepickerIntlPtBr } from 'app/utils/datepicker-intl-ptbr';
import localePt from '@angular/common/locales/pt';

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
    providers: [
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
            useClass: CustomDateAdapter,
        },
        { provide: MAT_DATE_FORMATS, useValue: FORMATOS_DATA_PTBR },
        { provide: MatDatepickerIntl, useClass: DatepickerIntlPtBr },

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
