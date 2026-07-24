
(()=>{'use strict';
const $=id=>document.getElementById(id);
const imageMap={
'Lewis Dunk':'player-images/lewis-dunk.svg','Kaoru Mitoma':'player-images/kaoru-mitoma.svg','Danny Welbeck':'player-images/danny-welbeck.svg','Solly March':'player-images/solly-march.svg','Bart Verbruggen':'player-images/bart-verbruggen.svg','Pascal Groß':'player-images/pascal-gross.svg','Glenn Murray':'player-images/glenn-murray.svg','Bobby Zamora':'player-images/bobby-zamora.svg','Bruno':'player-images/bruno.svg','Gordon Smith':'player-images/gordon-smith.svg','Peter Ward':'player-images/peter-ward.svg','Vicente':'player-images/vicente.svg'};
const stage=document.querySelector('.guess-silhouette'),img=$('guessPlayerImage'),clue=$('guessClue'),choices=$('guessChoices'),start=$('guessStart'),next=$('guessNextClue'),result=$('guessResult');
function currentName(){const buttons=[...choices?.querySelectorAll('button')||[]];const correct=buttons.find(b=>b.classList.contains('correct-choice'));if(correct)return correct.textContent.trim();const text=result?.textContent||'';const m=text.match(/It was ([^.]+)\./);return m?.[1]||null}
function inferFromChoices(){const names=[...choices?.querySelectorAll('button')||[]].map(b=>b.textContent.trim());return names.find(n=>imageMap[n]&&!(stage?.dataset.lastShown===n))||names.find(n=>imageMap[n])}
function show(name,level=1){if(!stage||!img||!name||!imageMap[name])return;stage.dataset.lastShown=name;img.src=imageMap[name];img.alt='Illustrated portrait of '+name;stage.classList.add('has-player');stage.classList.toggle('clue-2',level>=2);stage.classList.toggle('clue-3',level>=3);stage.classList.toggle('revealed',level>=4)}
start?.addEventListener('click',()=>setTimeout(()=>{stage?.classList.remove('revealed','clue-2','clue-3');show(inferFromChoices(),1)},0));
next?.addEventListener('click',()=>setTimeout(()=>{const t=clue?.querySelector('.clue-count')?.textContent||'';show(stage?.dataset.lastShown,t.includes('3')?3:2)},0));
choices?.addEventListener('click',()=>setTimeout(()=>show(currentName()||stage?.dataset.lastShown,4),0));
img?.addEventListener('error',()=>{img.removeAttribute('src');stage?.classList.remove('has-player')});
// Keep all character parts attached by removing conflicting version classes.
const taker=$('penaltyTaker'),keeper=$('keeper');
function cleanRig(el,keep){if(!el)return;[...el.classList].filter(c=>/^taker-v|^keeper-v/.test(c)&&c!==keep).forEach(c=>el.classList.remove(c))}
cleanRig(taker,'taker-v38');cleanRig(keeper,'keeper-v38');
})();
