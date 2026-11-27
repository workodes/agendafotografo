import { Injectable } from '@angular/core';
import { FuseNavigationItem } from '@fuse/components/navigation';
import { ModuloPlano } from 'app/models/enums/ModuloPlano';
import { ROLE_NAMES } from '../constants/RoleNames';

// Um menu por role: o usuário só vê os itens do próprio perfil. Os links levam o prefixo da role
// (o mesmo path usado em app.routes.ts). Módulos novos entram aqui junto com a rota, no plano de cada um:
// Assinante = Equipe, Organizadores, Tipos de evento, Agenda (a ficha do evento abre pela Agenda), Visão do dia, Pendências, Financeiro (plano 22), Checklist padrão etc.; Admin = Assinantes (plano 01).
@Injectable({ providedIn: 'root' })
export class MenuData {
    // Plano 24: item com `meta.modulo` só aparece para o Assinante se o plano liberar o módulo (filtro no NavigationService).
    private montarMenu(prefixo: string, extras: FuseNavigationItem[] = [], moduloInicio?: ModuloPlano): FuseNavigationItem[] {
        return [
            {
                id: 'inicio',
                title: 'Início',
                type: 'basic',
                icon: 'heroicons_outline:home',
                link: `/${prefixo}/inicio`,
                ...(moduloInicio ? { meta: { modulo: moduloInicio } } : {}),
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
            // Plano 24: planos e módulos liberados.
            {
                id: 'planos',
                title: 'Planos',
                type: 'basic',
                icon: 'heroicons_outline:rectangle-stack',
                link: `/${ROLE_NAMES.Admin.toLowerCase()}/planos`,
            },
        ]),
        // Fotógrafo (plano 20): só a Agenda (o início redireciona para ela, então não há item "Início").
        [ROLE_NAMES.Fotografo]: [
            {
                id: 'agenda',
                title: 'Agenda',
                type: 'basic',
                icon: 'heroicons_outline:calendar-days',
                link: `/${ROLE_NAMES.Fotografo.toLowerCase()}/agenda`,
            },
        ],
        [ROLE_NAMES.Assinante]: this.montarMenu(ROLE_NAMES.Assinante.toLowerCase(), [
            {
                id: 'agenda',
                title: 'Agenda',
                type: 'basic',
                icon: 'heroicons_outline:calendar-days',
                link: `/${ROLE_NAMES.Assinante.toLowerCase()}/agenda`,
            },
            {
                id: 'visao-do-dia',
                title: 'Visão da semana',
                type: 'basic',
                icon: 'heroicons_outline:sun',
                link: `/${ROLE_NAMES.Assinante.toLowerCase()}/visao-do-dia`,
                meta: { modulo: ModuloPlano.VisaoSemana },
            },
            {
                id: 'pendencias',
                title: 'Pendências',
                type: 'basic',
                icon: 'heroicons_outline:clipboard-document-check',
                link: `/${ROLE_NAMES.Assinante.toLowerCase()}/pendencias`,
            },
            {
                id: 'financeiro',
                title: 'Financeiro',
                type: 'collapsable',
                icon: 'heroicons_outline:banknotes',
                meta: { modulo: ModuloPlano.Financeiro },
                children: [
                    {
                        id: 'financeiro.lancamentos',
                        title: 'Lançamentos',
                        type: 'basic',
                        icon: 'heroicons_outline:list-bullet',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/financeiro/lancamentos`,
                    },
                    {
                        id: 'financeiro.dashboard',
                        title: 'Dashboard',
                        type: 'basic',
                        icon: 'heroicons_outline:chart-bar',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/financeiro/dashboard`,
                    },
                ],
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
                    {
                        id: 'cadastros.checklist-padrao',
                        title: 'Checklist padrão',
                        type: 'basic',
                        icon: 'heroicons_outline:clipboard-document-list',
                        link: `/${ROLE_NAMES.Assinante.toLowerCase()}/checklist-padrao`,
                    },
                ],
            },
        ], ModuloPlano.Inicio),
    };
}
