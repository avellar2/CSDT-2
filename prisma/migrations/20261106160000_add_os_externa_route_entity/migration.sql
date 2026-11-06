-- Auditoria de atribuição de OS externas a rotas operacionais.
-- A OS sem rota (criada antes da rota existir) pode ser atribuída por
-- ADMIN/ADMTOTAL; o registro fica em RouteTransfer com entityType OS_EXTERNA.

ALTER TYPE "RouteEntityType" ADD VALUE IF NOT EXISTS 'OS_EXTERNA';
