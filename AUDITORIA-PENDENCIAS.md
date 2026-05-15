# Auditoria CSDT-2 — Pendências

## ✅ Concluído

### Commit `bd193c0` — Limpeza de arquivos
- 44 arquivos removidos (lixo, backup, componentes/utils/assets não usados)
- 19 dependências npm removidas (336 pacotes)

### Commit `8ff71ef` — Fix PDF
- Strip de `\n` e `\r` antes de codificar texto em WinAnsi no PDF

### Commit `841118d` — Segurança
- Removido fallback `'your-secret-key'` de `JWT_SECRET` em `login.ts` e `auth.ts`
- Removido fallback `'default-key'` de `LOCAL_AGENT_API_KEY` em `printer-status-from-agent.ts`
- Variáveis configuradas no Vercel: `JWT_SECRET` e `LOCAL_AGENT_API_KEY`

### Commit `b486bd6` — Performance: N+1 query
- `chada/check-emails.ts`: Substituído `findUnique` em loop por `findMany` + Map

### Commit `ab477ee` — Performance: Query duplicada
- `advanced-statistics.ts`: Removida chamada duplicada de `oSExterna.count()`

### Commit `4c37a4f` — Limpeza de console.log
- Removidos ~321 console.log de ~90+ arquivos
- Mantidos apenas `console.error` em catch blocks

### Commit `1160da8` — Performance + fixes
- **Paginação**: Adicionado `take` em 6 APIs (`get-all-os-externas:500`, `items:500`, `get-memorandums:200`, `technical-tickets/list:200`, `chamados-escalas:200`, `all-schools:1000`)
- **Dynamic imports**: `react-chartjs-2` com `ssr: false` em 4 páginas (statistics, advanced-statistics, scales, schools/[id]); `@fullcalendar/react` com `ssr: false` em history.tsx
- **Fix orphans**: 9 arquivos com resquícios de console.log corrigidos (cancel-memorandum, check-pending-os, createItem, daily-demands-count, check-os-status, edit-memorandum, printer-status-from-agent, regenerate-memorandum-pdf, test-agent-data, chada, fill-pdf-form-2, scales)
- **TypeScript**: Corrigido cast de `jwt.verify/sign` em `auth.ts` e `login.ts`
- **Reinstalados**: recharts, exceljs, embla-carousel-react, net-snmp (ainda eram usados)

---

## 🟡 Código

### 7. Código duplicado ✅
| Função | Ocorrências |
|--------|-------------|
| `getPriorityColor` | Unificado em `src/utils/` |
| `getStatusColor` | Unificado em `src/utils/` |
| `formatDate` | Unificado em `src/utils/` |
| Toast state | Substituído por `useToast` hook |

### 8. Duas libs de ícones (phosphor-react + lucide-react) ✅
**Resolução:** Migrado para lucide-react, phosphor-react removido.

### 9. 3 páginas de otimização de rota quase idênticas ✅
**Resolução:** Mantida a canônica, removidas/redirecionadas as duplicadas.

---

## 🔵 API

### 10. 27 rotas sem chamadores no frontend ✅
**Resolução:** Verificadas e removidas as não utilizadas.

---

## ⚡ Arquitetura

### 11. Split de arquivos gigantes ✅
| Arquivo | Antes | Depois | Redução |
|---------|-------|--------|---------|
| `scales.tsx` | ~5000 | ~200 | ~96% |
| `chada.tsx` | ~3000 | ~150 | ~94% |
| `DeviceList.tsx` | ~2900 | 305 | 88% |
| `os-externas-list.tsx` | ~2000 | 329 | 79% |
| `fill-pdf-form-2.tsx` | ~1800 | 175 | 89% |

**Resolução:** Lógica extraída para hooks, componentes em arquivos separados.

---

## 📋 Próximos passos recomendados

1. ~~JWT + API key fallback~~ ✅
2. ~~Query duplicada~~ ✅
3. ~~N+1 query~~ ✅
4. ~~console.log~~ ✅
5. ~~Paginação queries~~ ✅
6. ~~Dynamic imports~~ ✅
7. ~~Código duplicado~~ ✅
8. ~~27 rotas API~~ ✅
9. ~~3 páginas duplicadas~~ ✅
10. ~~Consolidar ícones~~ ✅
11. ~~Split arquivos gigantes~~ ✅

**Auditoria concluída.** 🎉