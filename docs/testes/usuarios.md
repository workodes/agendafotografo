# Usuários de teste

> Senha: padrão Fartec. Não registre senhas neste arquivo.

Modelo de acesso: Assinante + área administrativa (multi-tenant)

## Admin
- admin@agendafotografo.com.br (criado pelo seed; senha padrão em `Seed.SenhaPadraoAdmin`, no `Seed.cs`)

## Assinante
- teste.a2@agendafotografo.test (assinante A, "Teste Automatizado A editado"; tem 7 tipos padrão, 1 tipo extra, 4 membros e 1 organizador)
- teste.b@agendafotografo.test (assinante B, "Teste Automatizado B 05/11"; usado para testar o isolamento entre assinantes; tem 7 tipos padrão e 1 tipo extra)
- teste.c@agendafotografo.test (assinante C, "Teste Layout 375 ...", ativo, com senha temporária ainda não trocada; serviu para testar layout, bloqueio e lockout; para usar, faça "Redefinir acesso")

As senhas de A e B (redefinidas em 05/11/2026) ficam fora do projeto, em
`C:\GitHub\EKANDMH\agendafotografo-wip\senhas-teste.txt` (pasta irmã do repositório, fora do git)
(um e-mail por linha, seguido da senha). Se perder o arquivo, use "Redefinir acesso" na tela de Assinantes.
