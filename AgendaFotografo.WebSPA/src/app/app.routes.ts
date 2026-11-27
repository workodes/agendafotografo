import { inject } from '@angular/core';
import { Route } from '@angular/router';
import { initialDataResolver } from 'app/app.resolvers';
import { AuthGuard } from 'app/core/auth/guards/auth.guard';
import { ModuloGuard } from 'app/core/auth/guards/modulo.guard';
import { NoAuthGuard } from 'app/core/auth/guards/noAuth.guard';
import { PlanoModuloService } from 'app/core/services/plano-modulo.service';
import { ModuloPlano } from 'app/models/enums/ModuloPlano';
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

// Área do Admin (back-office): Assinantes (lista, cadastro, bloqueio, redefinição de acesso e plano) e Planos (plano 24).
const rotasAdmin: Route[] = [
    ...rotasComuns,
    { path: 'assinantes', loadChildren: () => import('app/modules/admin/assinantes/assinantes.routes') },
    { path: 'planos', data: { titulo: 'Planos' }, loadChildren: () => import('app/modules/admin/planos/planos.routes') },
];

// Área do Assinante (coordenador): Equipe, Organizadores e Tipos de evento (plano 02); Eventos e Visão do dia (plano 03); Agenda (plano 04); Pendências (plano 06); Checklist padrão (plano 07); Início (plano 08); Financeiro (plano 22); Evento de outra equipe (plano 23). Link público etc. entram aqui, um plano por módulo.
// Plano 24: as rotas de módulos do plano têm `data.modulo` + ModuloGuard (não liberado: Início vai para a Agenda; os demais para
// "não disponível"). As outras (Agenda, ficha do evento, Pendências e Checklist padrão, cadastros, escalas) são a base, sempre liberada.
const rotasAssinante: Route[] = [
    // Sem o módulo Início a rota inicial é a Agenda (mesma regra do AuthService.getRotaInicial; o ModuloGuard confere de novo).
    { path: '', pathMatch: 'full', redirectTo: () => inject(PlanoModuloService).Liberado(ModuloPlano.Inicio) ? '/assinante/inicio' : '/assinante/agenda' },
    // Início próprio do assinante (plano 08): números do dia, próximos 7 dias e avisos. O Admin continua com o placeholder de rotasComuns.
    { path: 'inicio', canActivate: [ModuloGuard], data: { titulo: 'Início', modulo: ModuloPlano.Inicio }, loadChildren: () => import('app/modules/assinante/inicio/inicio-assinante.routes') },
    { path: 'agenda', data: { titulo: 'Agenda' }, loadChildren: () => import('app/modules/assinante/agenda/agenda.routes') },
    { path: 'eventos', data: { titulo: 'Eventos' }, loadChildren: () => import('app/modules/assinante/eventos/eventos.routes') },
    { path: 'visao-do-dia', canActivate: [ModuloGuard], data: { titulo: 'Visão da semana', modulo: ModuloPlano.VisaoSemana }, loadChildren: () => import('app/modules/assinante/visao-do-dia/visao-do-dia.routes') },
    { path: 'pendencias', data: { titulo: 'Pendências' }, loadChildren: () => import('app/modules/assinante/pendencias/pendencias.routes') },
    // Financeiro (plano 22): carteira do coordenador (Lançamentos, Dashboard e Fixos). Só no bloco do Assinante.
    { path: 'financeiro', canActivate: [ModuloGuard], data: { titulo: 'Financeiro', modulo: ModuloPlano.Financeiro }, loadChildren: () => import('app/modules/assinante/financeiro/financeiro.routes') },
    { path: 'equipe', data: { titulo: 'Equipe' }, loadChildren: () => import('app/modules/assinante/equipe/equipe.routes') },
    { path: 'organizadores', data: { titulo: 'Organizadores' }, loadChildren: () => import('app/modules/assinante/organizadores/organizadores.routes') },
    { path: 'checklist-padrao', data: { titulo: 'Checklist padrão' }, loadChildren: () => import('app/modules/assinante/checklist-padrao/checklist-padrao.routes') },
    { path: 'tipos-evento', data: { titulo: 'Tipos de evento' }, loadChildren: () => import('app/modules/assinante/tipos-evento/tipos-evento.routes') },
    // Evento de OUTRA equipe em que o coordenador foi escalado (plano 23): detalhe somente leitura, aberto pela Agenda; sem item de menu.
    // Reaproveita o detalhe do Fotógrafo, que escolhe o service pelo perfil da sessão. Só no bloco do Assinante.
    { path: 'escalas', data: { titulo: 'Evento' }, loadChildren: () => import('app/modules/fotografo/escala-detalhe/escala-detalhe.routes') },
    // Plano 24: destino de quem abre um módulo que o plano não libera (?modulo=N). Sem item de menu.
    { path: 'nao-disponivel', data: { titulo: 'Não disponível' }, loadChildren: () => import('app/modules/assinante/nao-disponivel/nao-disponivel.routes') },
];

// Área do Fotógrafo (plano 20, ajustada pelo plano 21): conta grátis que só vê os eventos em que um coordenador o
// escalou pelo documento (CPF ou CNPJ, plano 23). A agenda pessoal (rotas "eventos", plano 20) foi desligada e guardada pelo plano 21: os arquivos
// em modules/fotografo/eventos/ continuam no projeto, mas fora das rotas; as URLs antigas voltam para a agenda.
// Para religar, recolocar a rota "eventos" aqui (e rodar o build para conferir os arquivos guardados).
const rotasFotografo: Route[] = [
    { path: '', pathMatch: 'full', redirectTo: 'agenda' },
    { path: 'inicio', pathMatch: 'full', redirectTo: 'agenda' },
    { path: 'agenda', data: { titulo: 'Agenda' }, loadChildren: () => import('app/modules/fotografo/agenda/agenda.routes') },
    { path: 'eventos', pathMatch: 'full', redirectTo: 'agenda' },
    { path: 'eventos/novo', pathMatch: 'full', redirectTo: 'agenda' },
    { path: 'eventos/:id', pathMatch: 'full', redirectTo: 'agenda' },
    { path: 'escalas', data: { titulo: 'Evento' }, loadChildren: () => import('app/modules/fotografo/escala-detalhe/escala-detalhe.routes') },
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
            {
                path: ROLE_NAMES.Fotografo.toLowerCase(),
                canActivateChild: [AuthGuard],
                data: { requiredRoles: [ROLE_NAMES.Fotografo] },
                children: rotasFotografo,
            },
        ],
    },

    // Destino dos resolvers e do AuthorizationErrorHandlerService quando a carga de uma tela falha.
    { path: 'generic-error', loadChildren: () => import('app/modules/main/error/generic-error/generic-error.routes') },
    { path: '404-not-found', loadChildren: () => import('app/modules/main/error/error-404/error-404.routing') },
    { path: '**', redirectTo: '404-not-found' },
];
