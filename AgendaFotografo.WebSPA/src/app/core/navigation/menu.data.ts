import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { ROLE_NAMES } from '../constants/RoleNames';

// Um menu por role: o usuário só vê os itens do próprio perfil. Os links levam o prefixo da role
// (o mesmo path usado em app.routes.ts). Módulos novos entram aqui junto com a rota, no plano de cada um:
// Assinante = Equipe, Organizadores, Tipos de evento, Eventos, Agenda etc.; Admin = Assinantes (plano 01).
@Injectable({ providedIn: 'root' })
export class MenuData {
    private montarMenu(prefixo: string, extras: FuseNavigationItem[] = []): FuseNavigationItem[] {
        return [
            {
                id: 'inicio',
                title: 'Início',
                type: 'basic',
                icon: 'heroicons_outline:home',
                link: `/${prefixo}/inicio`,
            },
            ...extras,
        ];
    }

    readonly porRole: Record<string, FuseNavigationItem[]> = {
        [ROLE_NAMES.Admin]: this.montarMenu(ROLE_NAMES.Admin.toLowerCase(), [
            {
                id: 'assinantes',
                title: 'Assinantes',
                type: 'basic',
                icon: 'heroicons_outline:users',
                link: `/${ROLE_NAMES.Admin.toLowerCase()}/assinantes`,
            },
        ]),
        [ROLE_NAMES.Assinante]: this.montarMenu(ROLE_NAMES.Assinante.toLowerCase(), [
            {
                id: 'eventos',
                title: 'Eventos',
                type: 'basic',
                icon: 'heroicons_outline:calendar-days',
                link: `/${ROLE_NAMES.Assinante.toLowerCase()}/eventos`,
            },
            {
                id: 'visao-do-dia',
                title: 'Visão do dia',
                type: 'basic',
                icon: 'heroicons_outline:sun',
                link: `/${ROLE_NAMES.Assinante.toLowerCase()}/visao-do-dia`,
            },
            {
                id: 'cadastros',
                title: 'Cadastros',
                type: 'collapsable',
                icon: 'heroicons_outline:folder-open',
                children: [
                    {
                        id: 'cadastros.equipe',
                        title: 'Equipe',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/equipe`,
                    },
                    {
                        id: 'cadastros.organizadores',
                        title: 'Organizadores',
                        type: 'basic',
                        icon: 'heroicons_outline:building-office',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/organizadores`,
                    },
                    {
                        id: 'cadastros.tipos-evento',
                        title: 'Tipos de evento',
                        type: 'basic',
                        icon: 'heroicons_outline:tag',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/tipos-evento`,
                    },
                ],
            },
        ]),
    };
}
