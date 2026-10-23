const puppeteer = require('../frontend/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve(__dirname, '../demo_frames');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,840']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 840, deviceScaleFactor: 1 });

  let frameIdx = 0;
  async function capture(label, pause = 1200) {
    frameIdx++;
    const filename = `frame_${String(frameIdx).padStart(2, '0')}_${label}.png`;
    const fullPath = path.join(OUT_DIR, filename);
    await page.screenshot({ path: fullPath });
    console.log(`[Captured ${String(frameIdx).padStart(2, '0')}] ${label}`);
    await sleep(pause);
  }

  console.log('Navigating to http://localhost:8080 ...');
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await sleep(1500);

  // 1. Dashboard Overview
  await capture('01_dashboard_metrics', 1500);
  await page.evaluate(() => window.scrollBy({ top: 350, behavior: 'smooth' }));
  await sleep(800);
  await capture('02_dashboard_permissions_matrix', 1500);

  // 2. AI Coordinator
  console.log('Navigating to AI Coordinator...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('AI Coordinator'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('03_ai_coordinator_prompt', 1500);

  // Click "Run Coordination Plan"
  console.log('Executing AI Coordination Plan...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Run Coordination Plan') || b.textContent.includes('Run'));
    if (btn) btn.click();
  });
  await sleep(2200);
  await capture('04_ai_coordinator_trace_step', 1500);

  // 3. Weekly Care Plan
  console.log('Navigating to Weekly Care Plan...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Weekly Care Plan') || b.textContent.includes('Care Plan'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('05_weekly_care_plan_table', 1500);

  // Click "My Responsibilities" filter
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Responsibilities') || b.textContent.includes('Assigned'));
    if (btn) btn.click();
  });
  await sleep(1000);
  await capture('06_weekly_care_plan_filtered', 1500);

  // 4. Shared Calendar (Arun's view)
  console.log('Navigating to Shared Calendar (Arun view)...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Shared Calendar') || b.textContent.includes('Calendar'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('07_calendar_arun_full_details', 1800);

  // Switch User in Navbar to Karthik (Restricted Consent)
  console.log('Switching user to Karthik (Restricted Consent)...');
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      select.value = 'Karthik';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(1500);
  await capture('08_calendar_karthik_privacy_redacted', 2000);

  // Switch back to Arun
  await page.evaluate(() => {
    const select = document.querySelector('select');
    if (select) {
      select.value = 'Arun';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await sleep(800);

  // 5. Mock Healthcare Portals
  console.log('Navigating to Mock Portals...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Mock Portals') || b.textContent.includes('Portals'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('09_mock_healthcare_portals', 1800);

  // 6. Approval Center
  console.log('Navigating to Approval Center...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Approval Center') || b.textContent.includes('Approval'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('10_approval_center_diff', 1500);

  // Click Approve
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Approve'));
    if (btn) btn.click();
  });
  await sleep(1500);
  await capture('11_approval_executed_success', 1500);

  // 7. Test Center
  console.log('Navigating to Test Center...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Test Center') || b.textContent.includes('Test'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await capture('12_test_center_results', 1500);

  // Click on TC2 to show redacted privacy evidence
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('div, button'));
    const tc2 = cards.find(c => c.textContent.includes('TC2') && c.textContent.includes('Privacy'));
    if (tc2) tc2.click();
  });
  await sleep(1200);
  await capture('13_test_center_tc2_evidence', 1800);

  // Return to Dashboard
  console.log('Returning to Dashboard...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent.includes('Dashboard'));
    if (btn) btn.click();
  });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await sleep(600);
  await capture('14_dashboard_final_view', 1500);

  await browser.close();
  console.log('Demo walkthrough completed successfully! Total frames captured:', frameIdx);
}

run().catch(err => {
  console.error('Error during demo recording:', err);
  process.exit(1);
});
