# Pacote base Fartec: SPA Angular 18 + Fuse

Base limpa para criar o front-end de um sistema novo no padrão Fartec. Ela vem do SPA do
AgroGestor, sem as regras de negócio, e mantém o template Fuse, a autenticação JWT, o layout,
o perfil do usuário, as permissões por módulo e um CRUD de exemplo.

> Este pacote é usado automaticamente pelo agente `fartec:frontend` (plugin `fartec` do
> Claude Code). Quem estiver criando um projeto não precisa baixá-lo à mão.

## O que vem pronto

| Pasta / arquivo | Conteúdo |
|---|---|
| `src/app/core/auth/` | `AuthService` (login, token, role), interceptor JWT, `AuthGuard`, `NoAuthGuard`, `PermissaoGuard` |
| `src/app/core/constants/RoleNames.ts` | Roles do sistema (modelo "Apenas usuários": `Admin`, `Usuario`) |
| `src/app/core/navigation/menu.data.ts` | Um menu por role |
| `src/app/core/services/` | `UsuarioService`, `PermissaoService`, `MeService` |
| `src/app/app.routes.ts` | Rotas públicas + um bloco por role (prefixo = role em minúsculas) |
| `src/app/modules/auth/` | Login, recuperar senha, redefinir senha, sair |
| `src/app/modules/shared/inicio/` | Página inicial após o login |
| `src/app/modules/shared/perfil/` | Meu perfil e troca de senha |
| `src/app/modules/shared/exemplo/` | **CRUD de referência** (index paginado + detalhe no drawer) |
| `src/app/services/exemplo.service.ts` / `resolvers/exemplo.resolver.ts` | Service e resolver de referência |
| `src/app/models/` | `ApiResponse`, `PaginatedResponse`, `AuthModel`, `entities/`, `eNums/`, `DTOs/` |
| `src/environments/` | URLs da API (`environment.ts` e `environment.prod.ts`) |

## Marcadores a substituir em cada projeto

| Marcador / item | Onde | Substituir por |
|---|---|---|
| `__NOME_SISTEMA__` | `src/index.html`, rodapé do layout | Nome do sistema |
| `__DESCRICAO_SISTEMA__` | `src/index.html` | Descrição curta |
| `__COR_PRINCIPAL__` | `tailwind.config.js` (`principal`) | Cor principal (hex) |
| `__COR_APOIO__` | `tailwind.config.js` (`apoio`) | Cor de apoio gerada a partir da principal |
| Logo | `src/assets/images/logo/logo.png` | Logo do sistema |
| Favicon | `src/assets/images/favicon/favicon.ico` | Gerado a partir da logo |
| Fundo do login | `src/assets/images/background/background.jpeg` | Gradiente na cor do sistema ou imagem própria |
| `baseUrl` | `src/environments/*.ts` | URL da API local e de produção |
| `name` | `package.json`, `angular.json` (projeto `sistema`) | Nome do projeto |
| Roles | `RoleNames.ts`, `app.routes.ts`, `menu.data.ts`, `PermissaoService.ROLES_SEM_RESTRICAO` | Roles do modelo de acesso escolhido |

Modelo **Assinante**: troque as roles por `Admin`, `Assinante` e `UsuarioAssinante`, crie um
bloco de rotas e um menu para cada uma, e inclua `Assinante` em `ROLES_SEM_RESTRICAO`.

## Como criar um módulo novo

1. Copie `modules/shared/exemplo/` e renomeie para a entidade.
2. Crie a entidade em `models/entities/`, com os nomes de propriedade exatamente iguais aos do C#.
3. Crie o service em `services/` e o resolver em `resolvers/`, seguindo os de exemplo.
4. Adicione os endpoints em `environment.ts` **e** `environment.prod.ts`.
5. Adicione o módulo no `PermissaoModuloEnum`, com o mesmo valor do back-end.
6. Registre a rota em `app.routes.ts` e o item de menu em `menu.data.ts`.

Quando o projeto tiver o primeiro módulo real, remova o módulo de exemplo.

## Comandos

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build de produção em dist/wwwroot
```

## Licença

O template Fuse é um produto comercial (ThemeForest). Confira se a licença da Fartec cobre o
uso em cada sistema novo antes de distribuí-lo (`LICENSE.md`).
