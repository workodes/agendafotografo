// Espelha o RoleNames do back-end (AgendaFotografo.Domain). Perfis: Admin e Assinante.
// Um SPA só atende os dois, separados por rota: o prefixo de rota de cada role é o nome em minúsculas (ver app.routes.ts).
export const ROLE_NAMES = {
    Admin: 'Admin',
    Assinante: 'Assinante',
} as const;
