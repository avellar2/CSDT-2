const { Client } = require('pg');

async function setupLocalDatabase() {
  console.log('🔧 Configurando banco de dados local...\n');

  // Conectar no postgres (banco padrão) para criar o novo banco
  const adminClient = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '36595145v',
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log('✅ Conectado ao PostgreSQL local\n');

    // Verificar se banco csdt_dev já existe
    const checkDb = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'csdt_dev'"
    );

    if (checkDb.rows.length > 0) {
      console.log('⚠️  Banco csdt_dev já existe!');
      console.log('Deseja recriá-lo? (isso vai DELETAR todos os dados)\n');

      // Por segurança, não vou deletar automaticamente
      console.log('Para deletar e recriar, execute:');
      console.log('  DROP DATABASE csdt_dev;');
      console.log('  CREATE DATABASE csdt_dev;\n');
    } else {
      // Criar banco csdt_dev
      await adminClient.query('CREATE DATABASE csdt_dev');
      console.log('✅ Banco csdt_dev criado com sucesso!\n');
    }

    await adminClient.end();

    // Testar conexão com o novo banco
    const devClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '36595145v',
      database: 'csdt_dev'
    });

    await devClient.connect();
    console.log('✅ Conexão com csdt_dev OK!\n');

    // Verificar tabelas
    const tables = await devClient.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`📊 Tabelas no banco: ${tables.rows.length}`);
    if (tables.rows.length > 0) {
      console.log('Tabelas encontradas:');
      tables.rows.forEach(row => console.log(`  - ${row.tablename}`));
    } else {
      console.log('⚠️  Nenhuma tabela encontrada (banco vazio)');
      console.log('\nPróximo passo: rodar as migrations do Prisma');
      console.log('  npx prisma migrate deploy');
    }

    await devClient.end();

    console.log('\n✅ Setup completo!');
    console.log('\n📝 String de conexão para .env.local:');
    console.log('DATABASE_URL="postgresql://postgres:36595145v@localhost:5432/csdt_dev"');
    console.log('DIRECT_URL="postgresql://postgres:36595145v@localhost:5432/csdt_dev"');

  } catch (error) {
    console.error('❌ Erro:', error.message);

    if (error.message.includes('password authentication failed')) {
      console.error('\n⚠️  Senha incorreta! Verifique a senha do usuário postgres');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  PostgreSQL não está rodando ou não aceita conexões');
      console.error('Verifique se o serviço está ativo');
    }

    process.exit(1);
  }
}

setupLocalDatabase();
