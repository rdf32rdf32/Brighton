'use strict';
const {test,expect}=require('@playwright/test');

// Regression for the visually unstable transition below the penalty shoot-out.
// Observe the user's document scroll, rather than a scripted scrollIntoView,
// at both desktop and iPhone-style viewport sizes.
for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  test('scroll past penalties without jumping '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto('/',{waitUntil:'load'});
    await expect(page.locator('#penaltyStage')).toBeVisible();
    await expect(page.locator('#shootout')).toBeVisible();
    await page.evaluate(()=>{
      window.__penaltyVisibilityFlips=[];
      let was=document.body.classList.contains('shootout-in-view');
      const watcher=new MutationObserver(()=>{
        const now=document.body.classList.contains('shootout-in-view');
        if(now!==was){window.__penaltyVisibilityFlips.push(now);was=now;}
      });
      watcher.observe(document.body,{attributes:true,attributeFilter:['class']});
    });
    const info=await page.evaluate(()=>{
      const rect=document.getElementById('shootout').getBoundingClientRect();
      return {bottom:window.scrollY+rect.bottom, top:window.scrollY+rect.top, height:window.innerHeight};
    });
    const start=Math.max(0,info.bottom-1.12*info.height);
    const end=info.bottom+0.35*info.height;
    const ys=[];
    for(let i=0;i<=12;i++){
      const target=start+(end-start)*(i/12);
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),target);
      await page.waitForTimeout(65);
      ys.push(await page.evaluate(()=>{
        const game=document.getElementById('shootout').getBoundingClientRect();
        return {y:window.scrollY,absoluteBottom:game.bottom+window.scrollY,
          shootoutVisible:document.body.classList.contains('shootout-in-view')};
      }));
    }
    for(let i=1;i<ys.length;i++){
      expect(ys[i].y).toBeGreaterThan(ys[i-1].y-3);
      expect(Math.abs(ys[i].absoluteBottom-ys[0].absoluteBottom)).toBeLessThan(9);
    }
    const flips=await page.evaluate(()=>window.__penaltyVisibilityFlips);
    expect(flips.length,'visibility must not flicker from competing observers').toBeLessThanOrEqual(2);
    expect(errors).toEqual([]);
  });
}
