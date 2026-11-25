import { Routes } from '@angular/router';
import { financeiroResolver } from 'app/resolvers/financeiro.resolver';
import { FinanceiroComponent } from './financeiro.component';

// Financeiro do coordenador (plano 22). O resolver do pai gera os lançamentos dos gastos fixos ao abrir (F5 ou menu);
// trocar entre Lançamentos e Dashboard não repete (o pai continua montado). `fixos` é o link antigo da aba: vai para Lançamentos
// (os gastos fixos agora abrem num painel lateral dentro de Lançamentos).
export default [
    {
        path: '',
        component: FinanceiroComponent,
        resolve: { gerados: financeiroResolver },
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'lancamentos' },
            { path: 'lancamentos', loadComponent: () => import('./lancamentos/lancamentos.component').then(m => m.LancamentosComponent) },
            { path: 'dashboard', loadComponent: () => import('./dashboard/financeiro-dashboard.component').then(m => m.FinanceiroDashboardComponent) },
            { path: 'fixos', redirectTo: 'lancamentos' },
        ],
    },
] as Routes;
