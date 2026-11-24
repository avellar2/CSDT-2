# Endpoints com `requireAuth` inacessível — auditoria de 24/11/2026

Auditoria somente leitura feita durante o hotfix `fix/os-externa-auth-regression`.
**Nenhum destes endpoints foi alterado neste hotfix** para não ampliar o risco
sem cobertura funcional de todos os chamadores. Corrigir em PR de segurança
separada, com atualização dos clientes que ainda não enviam `Authorization`.

## Padrão do problema

A maioria dos arquivos tem `requireAuth`/`requireRole` **dentro** do bloco
`if (req.method !== '...')`, depois de um `return`. Na prática o método válido
nunca executa a checagem:

```ts
if (req.method !== 'GET') {
  return res.status(405).json({ error: 'Method not allowed' });
  // Requer autenticação
  const auth = await requireAuth(req, res); // inacessível
  if (!auth) return;
}
```

## Endpoints ainda com o padrão (31)

- `src/pages/api/advanced-statistics.ts`
- `src/pages/api/all-locations.ts`
- `src/pages/api/all-printers.ts`
- `src/pages/api/dashboard/chamados-abertos.ts`
- `src/pages/api/debug-demands.ts`
- `src/pages/api/diagnose-snmp.ts`
- `src/pages/api/discover-printer-oids.ts`
- `src/pages/api/generate-printer-control-pdf.ts`
- `src/pages/api/generate-sem-os-pdf.ts`
- `src/pages/api/get-memorandums.ts`
- `src/pages/api/impressoras.ts`
- `src/pages/api/internal-chat/count-pending.ts`
- `src/pages/api/internal-chat/messages/[ticketId].ts`
- `src/pages/api/internal-chat/send.ts`
- `src/pages/api/items.ts`
- `src/pages/api/items/[id]/history.ts`
- `src/pages/api/locados.ts`
- `src/pages/api/presentation-stats.ts`
- `src/pages/api/preventive-maintenance/check-emails.ts`
- `src/pages/api/preventive-maintenance/email-logs.ts`
- `src/pages/api/preventive-maintenance/list-os.ts`
- `src/pages/api/schools/[school]/items.ts`
- `src/pages/api/schools/[school]/stats.ts`
- `src/pages/api/send-preventive-maintenance.ts`
- `src/pages/api/technicians/delete-allocation.ts`
- `src/pages/api/technicians/getTechnicianNames.ts`
- `src/pages/api/technicians/move-technician.ts`
- `src/pages/api/technicians/remove-technician.ts`
- `src/pages/api/test-printer-detail.ts`
- `src/pages/api/update-item.ts`
- `src/pages/api/users/admins.ts`

## Corrigidos no hotfix

`schools`, `update-os-externa-fotos`, `update-os-externa-token`,
`upload-cloudinary`, `resend-os-email`, `os/[id]`, `update-os-status`,
`update-item-status`, `getSchoolVisits` e `chada-diagnostics/{delayed,printers,sectors}`.
Os clientes correspondentes passaram a enviar `Authorization`.

## Chamadas de cliente sem header (revisar junto)

- `src/components/Item/ItemList.tsx` → `/api/items`
- `src/hooks/useChada.ts` → `/api/items`
- `src/hooks/useDeviceList.ts` → `/api/all-locations`
- `src/components/Header.tsx` → `/api/internal-chat/count-pending`
- `src/hooks/useInternalChat.ts` → `/api/internal-chat/messages/:id`
- `src/components/PreventiveMaintenanceCard.tsx` → `preventive-maintenance/*`
- `src/components/PrinterRequestCard.tsx` → `/api/list-printer-requests`

## Endpoints abertos por legado que merecem revisão de contrato

- `GET /api/get-role?userId=...` — devolve `role`/`displayName` por `userId` sem autenticação.
- `GET /api/get-profile?userId=...` — devolve perfil por `userId` sem autenticação.
- `GET /api/list-printer-requests` — listagem sem autenticação.

## Recomendação

1. Mover `requireAuth`/`requireRole` para o início do handler em todos os itens.
2. Atualizar os chamadores listados para usar `getAuthHeaders()`/`authedFetch`.
3. Adicionar testes de 401 por endpoint (padrão de `tests/feedback-permissions.test.ts`).
4. Revisar os três endpoints de leitura por `userId`, preferindo identidade do token.
