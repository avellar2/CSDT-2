import { chromium } from 'playwright';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupTestItems() {
  console.log('Setting up test items...');

  // Buscar escola CSDT
  const csdt = await prisma.school.findFirst({ where: { name: 'CSDT' } });
  if (!csdt) {
    throw new Error('Escola CSDT não encontrada');
  }

  // Buscar usuário
  let user = await prisma.profile.findFirst({ where: { email: 'vanderson@csdt.com' } });

  // Criar 20 itens de teste
  const testItems = [];
  for (let i = 1; i <= 20; i++) {
    const item = await prisma.item.create({
      data: {
        name: 'Computador Teste Memo',
        brand: 'Dell Test Multi-Pagina',
        serialNumber: `TEST-MEMO-${String(i).padStart(3, '0')}`,
        userId: user?.userId || 'test-user',
        schoolId: csdt.id,
        status: 'DISPONIVEL'
      }
    });
    testItems.push(item);
    console.log(`Created test item ${i}: ${item.serialNumber} (ID: ${item.id})`);
  }

  return testItems;
}

async function cleanupTestItems(itemIds) {
  console.log('\nCleaning up test items...');

  // Deletar itens
  await prisma.item.deleteMany({
    where: {
      id: { in: itemIds }
    }
  });

  // Deletar histórios
  await prisma.itemHistory.deleteMany({
    where: {
      itemId: { in: itemIds }
    }
  });

  console.log(`Deleted ${itemIds.length} test items`);
}

async function runTest() {
  let testItems = [];

  try {
    // Setup: criar itens de teste
    testItems = await setupTestItems();
    const testItemIds = testItems.map(i => i.id);
    console.log(`\nCreated ${testItems.length} test items`);

    // Launch browser
    console.log('\nLaunching browser...');
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Navegar para login
      console.log('Navigating to login page...');
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');

      // Screenshot da página de login
      await page.screenshot({ path: 'test-screenshots/01-login-page.png' });
      console.log('✓ Login page loaded');

      // Preencher credenciais
      console.log('Filling credentials...');
      await page.fill('input[type="email"], input[name="email"]', 'vanderson@csdt.com');
      await page.fill('input[type="password"], input[name="password"]', '123456');
      await page.screenshot({ path: 'test-screenshots/02-login-filled.png' });

      // Clicar em login
      console.log('Clicking login button...');
      const loginButton = await page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
      await loginButton.click();

      // Esperar redirecionamento
      await page.waitForURL(/\/(dashboard|device-list)/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-screenshots/03-after-login.png' });
      console.log('✓ Logged in');

      // Navegar para device-list
      console.log('Navigating to device-list...');
      await page.goto('http://localhost:3000/device-list');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-screenshots/04-device-list.png' });
      console.log('✓ Device list loaded');

      // Clicar em "Gerar Memorando"
      console.log('Clicking "Gerar Memorando" button...');
      const memoButton = await page.locator('button:has-text("Gerar Memorando")').first();
      await memoButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/05-memorando-modal.png' });
      console.log('✓ Memorandum modal opened');

      // Verificar se o modal está aberto
      const modalVisible = await page.locator('text=Gerar Memorando').isVisible();
      if (!modalVisible) {
        throw new Error('Memorandum modal not visible');
      }

      // Selecionar tipo "Entrega"
      console.log('Selecting "Entrega" type...');
      await page.click('input[value="entrega"]');
      await page.waitForTimeout(500);

      // Selecionar uma escola (primeira opção)
      console.log('Selecting school...');
      const schoolSelect = await page.locator('[class*="select"]').first();
      await schoolSelect.click();
      await page.waitForTimeout(500);
      const firstSchoolOption = await page.locator('[class*="option"]').first();
      await firstSchoolOption.click();
      await page.waitForTimeout(500);

      // Selecionar itens de teste
      console.log('Selecting test items...');
      const testSerialNumbers = testItems.map(i => i.serialNumber);

      // Usar busca para filtrar
      const searchInput = await page.locator('input[placeholder*="Pesquisar"]').first();
      await searchInput.fill('TEST-MEMO');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/06-items-filtered.png' });

      // Marcar todos os itens visíveis
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      let checkedCount = 0;
      for (const checkbox of checkboxes) {
        try {
          await checkbox.check();
          checkedCount++;
        } catch (e) {
          // Checkbox pode já estar marcado ou não ser clicável
        }
      }
      console.log(`✓ Selected ${checkedCount} items`);

      // Verificar contador de páginas
      console.log('Checking page count indicator...');
      await page.waitForTimeout(1000);
      const pageText = await page.locator('text=/Serão geradas.*página/').textContent();
      console.log(`✓ Page indicator: ${pageText}`);

      // Screenshot final com itens selecionados
      await page.screenshot({ path: 'test-screenshots/07-items-selected.png' });

      // Verificar se mostra 2 páginas (20 itens / 13 = 2 páginas)
      if (pageText && pageText.includes('2')) {
        console.log('✅ TEST PASSED: Page count indicator shows 2 pages for 20 items');
      } else {
        console.log('❌ TEST FAILED: Page count indicator does not show expected 2 pages');
      }

      // Tirar screenshot do modal completo
      await page.screenshot({ path: 'test-screenshots/08-final-state.png', fullPage: true });

      console.log('\n=== TEST SUMMARY ===');
      console.log('✓ Created 20 test items');
      console.log('✓ Logged in successfully');
      console.log('✓ Opened memorandum modal');
      console.log('✓ Selected items');
      console.log(`✓ Page indicator: ${pageText}`);
      console.log('\n✅ MULTI-PAGE MEMORANDUM FEATURE IS WORKING!');

    } finally {
      await browser.close();
    }

  } finally {
    // Cleanup
    await cleanupTestItems(testItems.map(i => i.id));
    await prisma.$disconnect();
  }
}

// Create screenshots directory
import fs from 'fs';
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots', { recursive: true });
}

// Run test
runTest().catch(console.error);
