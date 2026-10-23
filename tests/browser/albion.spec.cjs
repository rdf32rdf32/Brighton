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

test('opponent briefing and verification note follow the newly active fixture', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-19T10:00:00Z'));
  await page.goto('/', {waitUntil:'load'});
  await expect(page.locator('#centreMatchTitle')).toContainText('FK Jablonec');
  await expect(page.locator('#opponentBriefingTitle')).toHaveText('FK Jablonec');
  await expect(page.locator('#matchCentreSource')).toContainText('23 October 2026');
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
  await page.clock.setFixedTime(new Date('2026-10-19T10:00:00Z'));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#resultsList')).toContainText('Sunderland');
  await expect(page.locator('#resultsList')).toContainText('0–2');
  await expect(page.locator('#centreMatchTitle')).toContainText('FK Jablonec');
  await expect(page.locator('#fixtureList')).toContainText('Sunderland');
  await expect(page.locator('#fixtureList')).toContainText('Result 0-2');
});
test('19 October next-fixture selector still resolves Jablonec', async ({page}) => {
  await page.clock.setFixedTime(new Date('2026-10-19T10:00:00Z'));
  await page.goto('/', {waitUntil:'load'});
  await expect(page.locator('#heroMatchTitle')).toHaveText('FK Jablonec v Albion');
  await expect(page.locator('#centreMatchTitle')).toHaveText('FK Jablonec v Albion');
  await expect(page.locator('#heroMatchVenue')).toHaveText('Stadion Střelnice');
  await expect(page.locator('#centreMatchDate')).toContainText('22 October 2026');
  await expect(page.locator('#heroLatestResult')).toContainText('0–0');
  await expect(page.locator('#heroLatestResult')).toContainText('Jablonec');
  await expect(page.locator('#resultsList')).toContainText('Kauno');
  await expect(page.locator('#resultsList')).toContainText('Crystal Palace');
  await expect(page.locator('#resultsList')).toContainText('5–0');
  await expect(page.locator('#allCompPlayed')).toHaveText('12');
  await expect(page.locator('#allCompGoals')).toHaveText('34–7');
  await expect(page.locator('#matchCentreSource')).toContainText('23 October 2026');
});
test('23 October match centre, draw stats and verified report are in sync', async ({page}) => {
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-23T12:00:00Z'));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#heroMatchTitle')).toHaveText('Liverpool v Albion');
  await expect(page.locator('#heroMatchDate')).toContainText('25 October 2026');
  await expect(page.locator('#centreMatchTitle')).toHaveText('Liverpool v Albion');
  await expect(page.locator('#centreMatchVenue')).toHaveText('Anfield');
  await expect(page.locator('#centreMatchTime')).toHaveText('14:00');
  await expect(page.locator('#heroLatestResult')).toContainText('Jablonec 0–0 Albion');
  await expect(page.locator('#allCompPlayed')).toHaveText('12');
  await expect(page.locator('#allCompWon')).toHaveText('8');
  await expect(page.locator('#allCompDrawn')).toHaveText('3');
  await expect(page.locator('#allCompLost')).toHaveText('1');
  await expect(page.locator('#allCompGoals')).toHaveText('34–7');
  const jablonec=page.locator('#resultsList .result-card').filter({hasText:'FK Jablonec'});
  await expect(jablonec).toContainText('0–0');
  await expect(jablonec.getByRole('link',{name:'Match report'})).toHaveAttribute('href',/brightonandhovealbion\.com\/media-article\/mft-match-report-conference-league/);
  await expect(page.locator('#nextAwayFixture')).toContainText('Liverpool');
  await expect(page.locator('#nextHomeDate')).toContainText('8 Nov 2026');
  await expect(page.locator('#nextOpponentMeetingsTitle')).toContainText('Liverpool');
  await page.locator('#monthFilter').selectOption('Nov 2026');
  await expect(page.locator('#fixtureList')).toContainText('8 Nov 2026');
  expect(errors).toEqual([]);
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

test('mobile navigation opens accessible settings',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('#menuToggle')).toBeVisible();
  await page.locator('#menuToggle').click();
  await expect(page.locator('#headerSettingsToggle')).toBeVisible();
  await page.locator('#headerSettingsToggle').click();
  await expect(page.locator('#supporter-settings')).toBeVisible();
  await expect(page.locator('#headerSettingsToggle')).toHaveAttribute('aria-expanded','true');
  await page.locator('#closeSettings').click();
  await expect(page.locator('#headerSettingsToggle')).toHaveAttribute('aria-expanded','false');
});

test('penalty guidance remains independently visible while Panenka is hidden',async({page})=>{
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#keyboardHint')).toBeVisible();
  await expect(page.locator('#keyboardHint')).toContainText('without diving');
  await expect(page.locator('#shootoutSituation')).toContainText('5 Albion · 5 Palace left');
  await expect(page.locator('#shootout .shootout-lead')).toContainText('After the whistle');
});
test('manual results notice is available with the latest verified result',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('.fixture-manual-note').first()).toContainText('maintained manually');
  await expect(page.locator('#resultsList')).toContainText('Sunderland');
  expect(errors).toEqual([]);
});


test('Stats Centre calculates fixtures and changes competition',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#statsKpis article')).toHaveCount(8);
  await expect(page.locator('#statsKpis')).toContainText('34');
  await expect(page.locator('#statsCompetitionRows tr')).toHaveCount(4);
  await page.locator('#statsCompetition').selectOption('Premier League');
  await expect(page.locator('#statsKpis')).toContainText('23');
  await expect(page.locator('#statsKpis')).toContainText('7');
  await page.locator('#statsTrendMetric').selectOption('conceded');
  await expect(page.locator('#statsTrend .stats-trend-row')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('heritage archive searches and filters verified milestones',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#archiveEntryList .archive-entry')).toHaveCount(12);
  await page.locator('#archiveSearch').fill('Hereford');
  await expect(page.locator('#archiveEntryList .archive-entry')).toHaveCount(1);
  await expect(page.locator('#archiveFeature')).toContainText('Survival at Hereford');
  await page.locator('#archiveEra').selectOption('amex');
  await expect(page.locator('#archiveEntryList .archive-entry')).toHaveCount(0);
  await page.locator('#archiveSearch').fill('');
  await expect(page.locator('#archiveEntryList .archive-entry')).toHaveCount(4);
  await expect(page.locator('.archive-photos img')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('mobile XI palette, locked prediction and manual accuracy check',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.setViewportSize({width:390,height:844});
  await page.goto('/',{waitUntil:'load'});
  await page.locator('#xi > .mobile-section-toggle').click();
  await expect(page.locator('#xi')).not.toHaveClass(/mobile-collapsed/);
  const player=page.locator('#xiPlayerPalette [data-xi-player="Bart Verbruggen"]');
  await player.click();
  await page.locator('#pitch .player-slot').first().click({position:{x:18,y:18}});
  await expect(page.locator('#pitch select').first()).toHaveValue('Bart Verbruggen');
  await page.locator('#loadPredicted').click();
  await expect(page.locator('#pitch select')).toHaveCount(11);
  await page.locator('#xiChecker').evaluate(el=>{el.open=true;});
  await page.locator('#xiLockPrediction').click();
  await expect(page.locator('#xiLockStatus')).toContainText('locked');
  const actual=page.locator('#xiConfirmedPlayers input[type="checkbox"]');
  for(let i=0;i<11;i++)await actual.nth(i).check();
  await expect(page.locator('#xiConfirmedCount')).toContainText('11 of 11');
  await page.locator('#xiCompareLineup').click();
  await expect(page.locator('#xiAccuracyResult')).toContainText('/11 correct');
  await expect(page.locator('#xiAccuracyHistory')).toContainText('Overall accuracy');
  expect(errors).toEqual([]);
});

test('live score shows verified Brighton match on mobile',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-22T18:00:00Z'));
  await page.setViewportSize({width:390,height:844});
  await page.route('https://site.api.espn.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},
    body:JSON.stringify({events:[{id:'987654',date:'2026-10-22T16:45:00Z',
      status:{type:{state:'in',completed:false,shortDetail:"74'"}},
      competitions:[{competitors:[
        {homeAway:'home',score:'1',team:{id:'999',displayName:'FK Jablonec',shortDisplayName:'Jablonec'}},
        {homeAway:'away',score:'2',team:{id:'331',displayName:'Brighton & Hove Albion',shortDisplayName:'Brighton'}}
      ]}]
    }]})
  }));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#albionLiveScore')).toContainText('Jablonec 1–2 Albion');
  await expect(page.locator('#albionLiveScore')).toHaveAttribute('data-feed-state','live');
  await expect(page.locator('#albionLiveScore')).toContainText('ESPN');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
  expect(overflow).toBe(false);
});
test('live score provider failure keeps verified manual archive without guessing',async({page})=>{
  await page.clock.setFixedTime(new Date('2026-10-22T18:00:00Z'));
  await page.route('https://site.api.espn.com/**',route=>route.fulfill({status:503,body:'Unavailable'}));
  await page.goto('/',{waitUntil:'load'});
  await expect(page.locator('#albionLiveScore')).toHaveAttribute('data-feed-state','offline');
  await expect(page.locator('#albionLiveScore')).toContainText('Manual fixture information remains available');
  await expect(page.locator('#resultsList')).toContainText('Crystal Palace');
  await expect(page.locator('#albionLiveScore')).not.toContainText('1–2');
});
