# Alerta de RLS desabilitado — revisão de segurança planejada

Data do registro: 2026-11-06
Escopo: documentação separada, conforme exigido na implementação de rotas operacionais.

## Situação

O projeto Supabase emite um alerta de **Row Level Security (RLS) desabilitado**.
A verificação feita no banco configurado (schema `public`) em 2026-11-06 mostra:

| Métrica | Valor |
|---|---|
| Tabelas no schema `public` | 45 |
| Tabelas sem RLS habilitado | 45 |
| Tabelas com RLS habilitado | 0 |

Tabelas novas criadas para as rotas operacionais também estão sem RLS:
`DailyRoute`, `DailyRouteTechnician`, `RouteTransfer`.
As tabelas já existentes consultadas (`SchoolDemand`, `TechnicalTicket`,
`chamados_escalas`, `Profile`) também estão sem RLS — ou seja, **o alerta é
anterior a esta entrega e não foi introduzido por ela**.

## O que esta entrega NÃO fez

- Não alterou políticas de RLS em nenhuma tabela.
- Não criou/removeu políticas, roles ou grants.
- Não mudou configurações do projeto Supabase relacionadas a segurança.

Isso foi deliberado: a separação por rotas foi implementada **no backend**
(`requireAuth` + escopo por rota nas APIs) e uma mudança global de RLS exigiria
uma revisão de segurança própria, com validação de impacto em todas as APIs.

## Risco enquanto o RLS permanecer desabilitado

- Qualquer acesso direto ao banco com a chave pública (`anon`) exposta ao
  cliente pode ler/escrever fora das regras de negócio da aplicação.
- As regras de autorização (perfil ADMIN/ADMTOTAL/TECH, rota do dia) existem
  apenas no código das APIs; elas não são reforçadas pelo banco.
- A separação de rotas, portanto, depende de todos os acessos passarem pelas
  APIs autenticadas do Next.js.

## Recomendação (revisão de segurança planejada)

1. Inventariar o uso de `anon`/`service_role` no cliente e em integrações.
2. Definir política por tabela (leitura/escrita) alinhada aos perfis do domínio.
3. Habilitar RLS em lote, começando por tabelas de dados pessoais
   (`Profile`, `User`) e pelas tabelas de rotas.
4. Validar todas as APIs após a mudança, em ambiente de teste, antes de produção.
5. Revisar grants e funções `SECURITY DEFINER` existentes.

Enquanto a revisão não acontece, este documento serve como registro formal do
alerta e da decisão de tratá-lo separadamente.
