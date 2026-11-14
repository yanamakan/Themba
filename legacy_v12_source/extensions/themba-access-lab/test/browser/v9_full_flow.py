from playwright.sync_api import sync_playwright
from pathlib import Path
p=Path(__file__).resolve().parents[2] / 'index.html'
with sync_playwright() as q:
 b=q.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for w in [1365,390]:
  page=b.new_page(viewport={'width':w,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.route('**/*',lambda r:r.abort())
  page.goto('about:blank');page.set_content(p.read_text(),wait_until='domcontentloaded')
  page.locator('[data-tab="payouts"]').click();page.locator('#request-payout').click();assert 'Payout requested' in page.locator('#feedback').inner_text()
  page.locator('[data-tab="audit"]').click();assert int(page.locator('#v9-audit-total').inner_text())>=2
  assert 'PAYOUT REQUEST' in page.locator('#audit-list').inner_text().upper();print('funded payout recorded, width',w)
  page.locator('[data-tab="setup"]').click()
  f=page.locator('#create-demo-group')
  f.locator('[name="name"]').fill('My Test Circle')
  f.locator('[name="members"]').fill('Amina\nBuhle\nCaro')
  f.locator('[name="contribution"]').fill('125')
  f.locator('[name="reserve"]').fill('15')
  page.once('dialog',lambda d:d.accept());f.locator('button').click()
  assert 'My Test Circle' in page.locator('#group').inner_text()
  assert '0,00' in page.locator('#rotation-balance').inner_text()
  print('custom group created',w, page.locator('#v9-active-source').inner_text())
  for i in range(3):
   page.locator('[data-tab="contributions"]').click()
   assert page.locator('#contribute').is_enabled(),f'not enabled on member index {i}'
   page.locator('#contribute').click()
   assert 'DEMO contribution recorded' in page.locator('#feedback').inner_text()
   if i<2:page.locator('#actor').select_option('demo-person-'+str(i+2))
  page.locator('[data-tab="audit"]').click();print('audit count after 3 contributions',page.locator('#v9-audit-total').inner_text(),page.locator('#audit-list .record').count())
  assert page.locator('#audit-list .record').count()>=4
  page.locator('#v9-audit-search').fill('contribution')
  assert page.locator('#audit-list .record').count()==3
  page.locator('#v9-audit-search').fill('')
  page.locator('#actor').select_option('demo-person-1')
  page.locator('[data-tab="payouts"]').click();assert page.locator('#request-payout').is_enabled();page.locator('#request-payout').click()
  # user cannot self approve, but requester's signer is configured; manually click first vote
  page.locator('#approval-list .record button').filter(has_text='Approve').first.click()
  assert 'cannot approve' in page.locator('#feedback').inner_text().lower()
  page.locator('#actor').select_option('demo-person-2')
  page.locator('#approval-list .record button').filter(has_text='Approve').first.click()
  page.locator('#actor').select_option('demo-person-3')
  page.locator('#approval-list .record button').filter(has_text='Approve').first.click()
  assert 'authorized demo' in page.locator('#approval-list').inner_text().lower()
  page.locator('[data-tab="audit"]').click();assert int(page.locator('#v9-audit-total').inner_text())>=8
  assert not errors,errors
  print('FLOW PASS',w,'ledger events',page.locator('#v9-audit-total').inner_text(),'overflow',page.evaluate('document.documentElement.scrollWidth > innerWidth'))
  page.close()
 b.close()
