// r89. Manual football results are not a live score feed.
(() => {
  "use strict";
  const iso=window.ALBION_DATA_R66?.checkedISO;
  const checked=Date.parse(String(iso||"")+"T12:00:00Z");
  if(!Number.isFinite(checked))return;
  const age=Math.max(0,Math.floor((Date.now()-checked)/86400000));
  if(age<7)return;
  document.querySelectorAll("[data-freshness]").forEach(node=>{
    if(node.querySelector(".data-age-note"))return;
    node.classList.add("is-stale");
    const info=document.createElement("span");
    info.className="data-age-note";
    info.append(document.createTextNode(" · Football data last reviewed "+age+" days ago. "));
    const link=document.createElement("a");
    link.href="https://www.brightonandhovealbion.com/fixtures-first-team-men";
    link.target="_blank";link.rel="noopener noreferrer";link.textContent="Verify with Albion ↗";
    info.append(link);node.append(info);
  });
})();
