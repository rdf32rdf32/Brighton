// r92. Fixtures and squad have separate verification dates, not a live feed.
(() => {
  "use strict";
  const data = window.ALBION_DATA_R66 || {};
  const fixturesDate = data.fixtureCheckedISO || data.checkedISO;
  const squadDate = data.squadCheckedISO || fixturesDate;
  const daysOld = iso => {
    const checked = Date.parse(String(iso || "") + "T12:00:00Z");
    return Number.isFinite(checked) ? Math.max(0, Math.floor((Date.now()-checked)/86400000)) : null;
  };

  // Surface missing past results, without ever inventing a final score.
  const monthNumbers={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const unconfirmed=(data.fixtures||[]).filter(f=>{
    const parts=/^(\d{1,2}) ([A-Z][a-z]{2}) (20\d{2})$/.exec(f.date||"");
    if(!parts || monthNumbers[parts[2]]==null)return false;
    const nextDay=Date.UTC(+parts[3],monthNumbers[parts[2]],+parts[1]+1);
    return Date.now()>nextDay && !Number.isFinite(f.albionGoals) && !Number.isFinite(f.opponentGoals)
      && !/postponed|cancelled|abandoned/i.test(f.status||"");
  });
  const section=document.getElementById("matches");
  if(unconfirmed.length && section && !document.getElementById("resultPendingNotice")){
    const note=document.createElement("p");note.id="resultPendingNotice";note.className="fixture-manual-note";
    note.textContent=unconfirmed.length+" match result(s) await verification. No final score has been guessed. ";
    const link=document.createElement("a");link.href="https://www.brightonandhovealbion.com/fixtures-first-team-men";
    link.target="_blank";link.rel="noopener noreferrer";link.textContent="Verify results ↗";note.append(link);
    const reference=section.querySelector(".match-view-tabs");
    if(reference)section.insertBefore(note,reference);else section.append(note);
  }
  document.querySelectorAll("[data-freshness]").forEach(node => {
    const category = node.dataset.freshness;
    const squad = category === "squad";
    const reviewed = squad ? squadDate : fixturesDate;
    const age = daysOld(reviewed);
    if (age == null || age < 7 || node.querySelector(".data-age-note")) return;
    node.classList.add("is-stale");
    const info = document.createElement("span");
    info.className = "data-age-note";
    info.append(document.createTextNode(
      " · " + (squad ? "Squad" : "Fixture/results") + " data last reviewed " + age + " days ago. "
    ));
    const link=document.createElement("a");
    link.href=squad ? "https://www.brightonandhovealbion.com/teams/mens-team" : "https://www.brightonandhovealbion.com/fixtures-first-team-men";
    link.target="_blank"; link.rel="noopener noreferrer"; link.textContent="Verify with Albion ↗";
    info.append(link);node.append(info);
  });
})();
