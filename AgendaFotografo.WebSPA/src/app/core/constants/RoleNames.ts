// Espelha o RoleNames do back-end (AgendaFotografo.Domain). Perfis: Admin, Assinante (coordenador) e Fotografo (plano 20).
// Um SPA só atende os três, separados por rota: o prefixo de rota de cada role é o nome em minúsculas (ver app.routes.ts).
export const ROLE_NAMES = {
    Admin: 'Admin',
    Assinante: 'Assinante',
    Fotografo: 'Fotografo',
} as const;
