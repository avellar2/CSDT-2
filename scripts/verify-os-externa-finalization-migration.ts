/**
 * Verificação SOMENTE LEITURA da migração aditiva no Supabase.
 *
 * Mostra host/banco/usuário (sem senha), existência da tabela/índices, RLS,
 * policies, grants de anon/authenticated, registro em _prisma_migrations e
 * acesso via Prisma. Não altera nada.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function safeUrlInfo() {
  const raw = process.env.DATABASE_URL || process.env.DIRECT_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ""),
      user: url.username,
      // Nunca imprime senha/query string.
    };
  } catch {
    return null;
  }
}

async function main() {
  const info = await prisma.$queryRawUnsafe<
    Array<{ db: string; usr: string; addr: string | null; version: string }>
  >(
    `select current_database() as db,
            current_user as usr,
            inet_server_addr()::text as addr,
            version() as version`
  );

  console.log("Conexão:", JSON.stringify(safeUrlInfo()));
  console.log("Servidor:", {
    db: info[0]?.db,
    usr: info[0]?.usr,
    addr: info[0]?.addr,
    version: info[0]?.version?.split(",")[0],
  });

  const os651 = await prisma.oSExterna.findUnique({
    where: { numeroOs: "651/2026" },
    select: {
      id: true,
      numeroOs: true,
      unidadeEscolar: true,
      data: true,
      status: true,
      fotosAntes: true,
      fotosDepois: true,
      assinado: true,
      lastEmailSent: true,
    },
  });
  console.log("OS 651/2026 (confirma produção):", os651);

  const totalOs = await prisma.oSExterna.count();
  console.log("Total de OSExterna:", totalOs);

  const table = await prisma.$queryRawUnsafe<Array<{ t: string | null }>>(
    `select to_regclass('"OsExternaFinalizationState"')::text as t`
  );
  const exists = Boolean(table[0]?.t);
  console.log("Tabela OsExternaFinalizationState:", exists ? "EXISTE" : "AUSENTE");

  if (exists) {
    const columns = await prisma.$queryRawUnsafe<
      Array<{ column_name: string; data_type: string; is_nullable: string }>
    >(
      `select column_name, data_type, is_nullable
         from information_schema.columns
        where table_name = 'OsExternaFinalizationState'
        order by ordinal_position`
    );
    console.log("Colunas:", columns);

    const indexes = await prisma.$queryRawUnsafe<
      Array<{ indexname: string; indexdef: string }>
    >(
      `select indexname, indexdef
         from pg_indexes
        where tablename = 'OsExternaFinalizationState'
        order by indexname`
    );
    console.log("Índices:", indexes);

    const rls = await prisma.$queryRawUnsafe<
      Array<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>
    >(
      `select relrowsecurity, relforcerowsecurity
         from pg_class
        where oid = '"OsExternaFinalizationState"'::regclass`
    );
    console.log("RLS:", rls[0]);

    const policies = await prisma.$queryRawUnsafe<Array<{ policyname: string }>>(
      `select policyname from pg_policies where tablename = 'OsExternaFinalizationState'`
    );
    console.log("Policies:", policies.length ? policies : "nenhuma (deny direto)");

    const grants = await prisma.$queryRawUnsafe<
      Array<{ grantee: string; privilege_type: string }>
    >(
      `select grantee, privilege_type
         from information_schema.role_table_grants
        where table_name = 'OsExternaFinalizationState'
        order by grantee, privilege_type`
    );
    console.log("Grants na tabela:", grants);

    const seq = await prisma.$queryRawUnsafe<
      Array<{ seq: string | null; anon: boolean | null; authenticated: boolean | null }>
    >(
      `select to_regclass('"OsExternaFinalizationState_id_seq"')::text as seq,
              case when exists (select 1 from pg_roles where rolname='anon')
                   then has_sequence_privilege('anon', '"OsExternaFinalizationState_id_seq"', 'USAGE')
                   else null end as anon,
              case when exists (select 1 from pg_roles where rolname='authenticated')
                   then has_sequence_privilege('authenticated', '"OsExternaFinalizationState_id_seq"', 'USAGE')
                   else null end as authenticated`
    );
    console.log("Sequence ACL (USAGE):", seq[0]);

    const count = await prisma.osExternaFinalizationState.count();
    console.log("Acesso Prisma (count):", count);

    // Teste de escrita com rollback: valida INSERT/UPDATE sem deixar resíduo.
    let rolledBack = false;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.osExternaFinalizationState.create({
          data: { osId: -999999, stage: "fotos", updatedBy: "verification" },
        });
        await tx.osExternaFinalizationState.update({
          where: { osId: -999999 },
          data: { stage: "token" },
        });
        throw new Error("__rollback__");
      });
    } catch (error) {
      rolledBack = (error as Error).message === "__rollback__";
    }
    const residual = await prisma.osExternaFinalizationState.count({
      where: { osId: -999999 },
    });
    console.log("Prisma write/rollback:", rolledBack ? "OK" : "FALHOU");
    console.log("Resíduo do teste:", residual);
  }

  const migration = await prisma.$queryRawUnsafe<
    Array<{
      migration_name: string;
      finished_at: Date | null;
      applied_steps_count: number;
      rolled_back_at: Date | null;
    }>
  >(
    `select migration_name, finished_at, applied_steps_count, rolled_back_at
       from "_prisma_migrations"
      where migration_name = '20261127120000_add_os_externa_finalization_state'`
  );
  console.log("Registro _prisma_migrations:", migration);
}

main()
  .catch((error) => {
    console.error("Falha na verificação:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
