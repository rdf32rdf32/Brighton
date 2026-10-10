const {test,expect}=require('@playwright/test');
test('page boots and guided tour advances',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#shootout')).toBeVisible();
  await expect(page.locator('#resultsList details.result-month').first()).toBeAttached();
  await page.locator('#startTour').click();
  await expect(page.locator('#tourCoach')).toBeVisible();
  await page.locator('#tourNext').click();
  await expect(page.locator('#tourPosition')).toContainText('2 of');
  await page.locator('#tourClose').click();
  expect(errors).toEqual([]);
});
test('results accordion and squad category switching work',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.locator('#expandResultsMonths').click();
  const months=page.locator('#resultsList details.result-month');
  expect(await months.count()).toBeGreaterThan(0);
  await expect.poll(async()=>months.evaluateAll(a=>a.every(e=>e.open))).toBe(true);
  await page.locator('#collapseResultsMonths').click();
  await expect.poll(async()=>months.evaluateAll(a=>a.every(e=>!e.open))).toBe(true);
  // Desktop presents a position filter. Mobile displays dedicated category tabs.
  await page.locator('#playerPositionFilter').selectOption('Defender');
  await expect(page.locator('#playerProfileGrid')).not.toBeEmpty();
  await page.setViewportSize({width:390,height:844});
  for(const position of ['Defender','Midfielder','Forward','Goalkeeper']){
    const tab=page.locator('#playerCategoryTabs [data-player-category="'+position+'"]');
    await expect(tab).toBeVisible();
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected','true');
  }
  expect(errors).toEqual([]);
});
for(const viewport of [{width:390,height:844},{width:736,height:320},{width:1200,height:800}]){
  test('goalkeeper line '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);await page.goto('/');
    const keeper=page.locator('#keeperFigure');
    await expect.poll(async()=>keeper.evaluate(el=>Boolean(el.style.top))).toBe(true);
    const v=await page.evaluate(()=>{
      const el=document.getElementById('keeperFigure'),st=document.getElementById('penaltyStage');
      const w=parseFloat(getComputedStyle(el).width);
      return {inset:st.clientHeight*(315/650)-(parseFloat(el.style.top)+w*(250/180)*(229/250)),
        centre:el.style.left,stageHeight:st.clientHeight};
    });
    expect(v.stageHeight).toBeGreaterThan(100);expect(v.centre).toBe('50%');
    expect(v.inset).toBeGreaterThan(viewport.width<=900?3:-2);
    expect(v.inset).toBeLessThan(viewport.width<=900?11:2);
  });
}

test('deep links keep their fragment and scroll target after reload', async ({page}) => {
  await page.goto('/#players', {waitUntil:'load'});
  await expect(page).toHaveURL(/#players$/);
  await page.reload({waitUntil:'load'});
  console.log('RELOAD ANCHOR', await page.evaluate(() => ({hash:location.hash,y:scrollY,viewport:innerHeight,documentHeight:document.documentElement.scrollHeight,playersTop:document.querySelector('#players')?.getBoundingClientRect().top,playersBottom:document.querySelector('#players')?.getBoundingClientRect().bottom})));
  await expect(page).toHaveURL(/#players$/);
  await expect(page.locator('#players')).toBeVisible();
  await expect.poll(() => page.locator('#players').evaluate(el =>
    el.getBoundingClientRect().top < window.innerHeight &&
    el.getBoundingClientRect().bottom > 0
  )).toBe(true);
});

test('next opponent briefing and verification note follow the active fixture', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-11T12:00:00Z'));
  await page.goto('/', {waitUntil:'load'});
  await expect(page.locator('#centreMatchTitle')).toContainText('FK Kauno Žalgiris');
  await expect(page.locator('#opponentBriefingTitle')).toHaveText('FK Kauno Žalgiris');
  await expect(page.locator('#matchCentreSource')).toContainText('15 October 2026');
  await expect(page.locator('#matchCentreSource')).not.toContainText('Sunderland');
});

test('penalty instructions forbid diving before the whistle', async ({page}) => {
  await page.goto('/');
  const lead=page.locator('#shootout .shootout-lead');
  await expect(lead).toContainText('shuffle Verbruggen along his goal line (no diving)');
  await expect(lead).toContainText('After the whistle');
  await expect(lead).not.toContainText('gamble before the whistle');
});

test('Sunderland 0-2 result and next fixture appear together',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-10T19:00:00Z'));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#resultsList')).toContainText('Sunderland');
  await expect(page.locator('#resultsList')).toContainText('0–2');
  await expect(page.locator('#centreMatchTitle')).toContainText('FK Kauno Žalgiris');
  await expect(page.locator('#fixtureList')).toContainText('Sunderland');
  await expect(page.locator('#fixtureList')).toContainText('Result 0-2');
});
test('maintenance editor validates and exports the active dataset',async({page})=>{
  await page.goto('/editor.html');
  await expect(page.locator('#fixtureRows tr')).toHaveCount(48);
  await expect(page.locator('#squadRows tr')).toHaveCount(36);
  const sunderland=page.locator('#fixtureRows tr').nth(8);
  await expect(sunderland.locator('[data-field="opponent"]')).toHaveValue('Sunderland');
  await expect(sunderland.locator('[data-field="albionGoals"]')).toHaveValue('2');
  await expect(sunderland.locator('[data-field="opponentGoals"]')).toHaveValue('0');
  await page.locator('#validateContent').click();
  await expect(page.locator('#editorStatus')).toContainText('Validation passed');
  const pending=page.waitForEvent('download');
  await page.locator('#downloadContent').click();
  const download=await pending;
  expect(download.suggestedFilename()).toBe('albion-data-r78.js');
});
test('sound, monthly results and accessibility preferences respond',async({page})=>{
  await page.goto('/');
  await page.locator('#expandResultsMonths').click();
  await expect(page.locator('#resultsList details.result-month[open]').first()).toBeAttached();
  await page.locator('#inlineSoundToggle').click();
  await expect(page.locator('#soundStatus')).not.toBeEmpty();
  await page.locator('#headerSettingsToggle').click();
  await expect(page.locator('#headerSettingsToggle')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#supporter-settings')).toBeVisible();
  await page.locator('#largeTextSetting').check();
  await expect(page.locator('#largeTextSetting')).toBeChecked();
});
