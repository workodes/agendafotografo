import { Route } from '@angular/router';
import { initialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { LayoutComponent } from 'app/layout/layout.component';
import { ROLE_NAMES } from './core/constants/RoleNames';

// Um SPA só, perfis separados por rota. Cada role tem seu próprio bloco (prefixo = nome da role
// em minúsculas): /admin/... e /assinante/.... Rota nova entra no array da(s) role(s) que a acessa
// e no menu correspondente em core/navigation/menu.data.ts.

// Módulos disponíveis para as duas roles (hoje só o Início; o do Admin é o placeholder compartilhado).
const rotasComuns: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    { path: 'inicio', loadChildren: () => import('app/modules/shared/inicio/inicio.routes') },
];

// Área do Admin (back-office): Assinantes (lista, cadastro, bloqueio e redefinição de acesso).
const rotasAdmin: Route[] = [
    ...rotasComuns,
    { path: 'assinantes', loadChildren: () => import('app/modules/admin/assinantes/assinantes.routes') },
];

// Área do Assinante (coordenador): Equipe, Organizadores e Tipos de evento (plano 02); Eventos e Visão do dia (plano 03); Agenda (plano 04); Pendências (plano 06); Checklist padrão (plano 07); Início (plano 08). Link público etc. entram aqui, um plano por módulo.
const rotasAssinante: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'inicio' },
    // Início próprio do assinante (plano 08): números do dia, próximos 7 dias e avisos. O Admin continua com o placeholder de rotasComuns.
    { path: 'inicio', data: { titulo: 'Início' }, loadChildren: () => import('app/modules/assinante/inicio/inicio-assinante.routes') },
    { path: 'agenda', data: { titulo: 'Agenda' }, loadChildren: () => import('app/modules/assinante/agenda/agenda.routes') },
    { path: 'eventos', data: { titulo: 'Eventos' }, loadChildren: () => import('app/modules/assinante/eventos/eventos.routes') },
    { path: 'visao-do-dia', data: { titulo: 'Visão da semana' }, loadChildren: () => import('app/modules/assinante/visao-do-dia/visao-do-dia.routes') },
    { path: 'pendencias', data: { titulo: 'Pendências' }, loadChildren: () => import('app/modules/assinante/pendencias/pendencias.routes') },
    { path: 'equipe', data: { titulo: 'Equipe' }, loadChildren: () => import('app/modules/assinante/equipe/equipe.routes') },
    { path: 'organizadores', data: { titulo: 'Organizadores' }, loadChildren: () => import('app/modules/assinante/organizadores/organizadores.routes') },
    { path: 'checklist-padrao', data: { titulo: 'Checklist padrão' }, loadChildren: () => import('app/modules/assinante/checklist-padrao/checklist-padrao.routes') },
    { path: 'tipos-evento', data: { titulo: 'Tipos de evento' }, loadChildren: () => import('app/modules/assinante/tipos-evento/tipos-evento.routes') },
];

export const appRoutes: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'sign-in' },

    // Rotas públicas anônimas (sem login, sem menu): ficam FORA do layout autenticado e dos guards.
    // /e/:token = link público do evento (protegido por código de 4 dígitos; plano "Link público").
    {
        path: 'e',
        component: LayoutComponent,
        data: { layout: 'empty' },
        children: [
            { path: ':token', loadChildren: () => import('app/modules/publico/evento-publico/evento-publico.routes') },
        ],
    },

    // Rotas de entrada (login); usuário já logado é redirecionado para a página inicial da role
    {
        path: '',
        canActivate: [NoAuthGuard],
        canActivateChild: [NoAuthGuard],
        component: LayoutComponent,
        data: { layout: 'empty' },
        children: [
            // Mesmo componente nas duas abas: data.aba diz qual abre (Entrar | Cadastro).
            { path: 'sign-in', data: { aba: 'entrar' }, loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes') },
            { path: 'sign-up', data: { aba: 'cadastro' }, loadChildren: () => import('app/modules/auth/sign-in/sign-in.routes') },
        ],
    },

    // Rotas autenticadas
    {
        path: '',
        component: LayoutComponent,
        resolve: { initialData: initialDataResolver },
        children: [
            {
                path: '',
                canActivateChild: [AuthGuard],
                data: { layout: 'empty', requiredRoles: Object.values(ROLE_NAMES) },
                children: [{ path: 'sign-out', loadChildren: () => import('app/modules/auth/sign-out/sign-out.routes') }],
            },
            {
                path: ROLE_NAMES.Admin.toLowerCase(),
                canActivateChild: [AuthGuard],
                data: { requiredRoles: [ROLE_NAMES.Admin] },
                children: rotasAdmin,
            },
            {
                path: ROLE_NAMES.Assinante.toLowerCase(),
                canActivateChild: [AuthGuard],
                data: { requiredRoles: [ROLE_NAMES.Assinante] },
                children: rotasAssinante,
            },
        ],
    },

    // Destino dos resolvers e do AuthorizationErrorHandlerService quando a carga de uma tela falha.
    { path: 'generic-error', loadChildren: () => import('app/modules/main/error/generic-error/generic-error.routes') },
    { path: '404-not-found', loadChildren: () => import('app/modules/main/error/error-404/error-404.routing') },
    { path: '**', redirectTo: '404-not-found' },
];
