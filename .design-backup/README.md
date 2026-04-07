# Design System Backup

Este diretório contém os arquivos com o Design System aplicado.

## Como voltar para o Design System

Para restaurar as estilizações do Design System, execute:

```bash
# Restaurar todos os arquivos
cp .design-backup/_app.tsx src/pages/_app.tsx
cp .design-backup/create-internal-os.tsx src/pages/create-internal-os.tsx
cp .design-backup/internal-demands.tsx src/pages/internal-demands.tsx
cp .design-backup/schools.tsx src/pages/schools.tsx
cp .design-backup/statistics.tsx src/pages/statistics.tsx
cp .design-backup/Dashboard.tsx src/components/Dashboard.tsx
cp .design-backup/globals.css src/styles/globals.css
cp src/pages/items.tsx.new.backup src/pages/items.tsx
```

## Arquivos salvos

- `_app.tsx` - Configuração global da app
- `create-internal-os.tsx` - Página de criação de OS interna
- `internal-demands.tsx` - Página de demandas internas
- `schools.tsx` - Página de escolas
- `statistics.tsx` - Página de estatísticas
- `Dashboard.tsx` - Componente Dashboard
- `globals.css` - Estilos globais
- `items.tsx.new.backup` - Página de itens (na raiz de src/pages/)

## Data do backup

2026-04-07
