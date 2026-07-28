const KEY='danielmente-data-v1';
const goals={sleep:8,weight:230,movement:30,eating:4,screenMinutes:120,bpSystolic:120,bpDiastolic:80};
const colors={sleep:'#7457ff',weight:'#ff4d8d',movement:'#13b68a',screen:'#ff9f1c',eating:'#1f8cff',bp:'#8b5cf6',bp2:'#2563eb'};
const defaultData={entries:{},settings:{screenGoalMinutes:120,notifications:false},reports:{}};

injectVersionTwoLayout();

let data=load();
let deferredPrompt;
const $=s=>document.querySelector(s);
const today=()=>new Date().toISOString().slice(0,10);
const fmtDate=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});

function injectVersionTwoLayout(){
  const style=document.createElement('style');
  style.textContent=`
    :root{--bp:#8b5cf6}
    input,select{min-width:0;max-width:100%}
    .accent-bp{--accent:var(--bp)}
    .sleep-time-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important}
    .sleep-time-grid label{min-width:0}
    .sleep-time-grid input[type="time"]{min-width:0;width:100%;padding-left:9px;padding-right:7px}
    @media(max-width:420px){
      .sleep-time-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:8px}
      .sleep-time-grid input[type="time"]{font-size:16px;padding:11px 6px}
    }
  `;
  document.head.appendChild(style);

  const sleepPanel=document.querySelector('.accent-sleep');
  const sleepGrid=sleepPanel?.querySelector('.two-col');
  sleepGrid?.classList.add('sleep-time-grid');

  const weightPanel=document.querySelector('.accent-weight');
  const weightHeading=weightPanel?.querySelector('h3');
  if(weightHeading)weightHeading.innerHTML='Next goal: <span id="nextWeightGoal">360 lb</span>';
  const weightLabels=weightPanel?.querySelector('.goal-labels');
  if(weightLabels)weightLabels.innerHTML='<span>360</span><span>Ultimate: 230 lb</span>';

  const screenPanel=document.querySelector('.accent-screen');
  const screenHeading=screenPanel?.querySelector('h3');
  if(screenHeading)screenHeading.textContent='Goal: 2 hours';
  screenPanel?.querySelector('.note')?.remove();

  if(!document.querySelector('#bpChart')){
    const eatingPanel=document.querySelector('.accent-eating');
    const bp=document.createElement('section');
    bp.className='panel accent-bp';
    bp.innerHTML=`
      <div class="panel-header">
        <div><p class="eyebrow">BLOOD PRESSURE</p><h3>Goal: 120/80 · Track once a week</h3></div>
        <div class="metric-badge" id="bpToday">—</div>
      </div>
      <div class="two-col">
        <label>Systolic<input id="systolicInput" type="number" min="70" max="250" inputmode="numeric" placeholder="120"></label>
        <label>Diastolic<input id="diastolicInput" type="number" min="40" max="150" inputmode="numeric" placeholder="80"></label>
      </div>
      <button class="primary" data-save="bp">Save blood pressure</button>
      <canvas id="bpChart" height="180"></canvas>
    `;
    eatingPanel?.before(bp);
  }
}

function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||'{}');
    const merged={
      ...defaultData,
      ...saved,
      entries:saved.entries||{},
      reports:saved.reports||{},
      settings:{...defaultData.settings,...(saved.settings||{})}
    };
    if(merged.settings.screenGoalMinutes==null||merged.settings.screenGoalMinutes===240){
      merged.settings.screenGoalMinutes=120;
    }
    return merged;
  }catch{
    return structuredClone(defaultData);
  }
}

function save(){localStorage.setItem(KEY,JSON.stringify(data));renderAll()}
function entry(date){return data.entries[date]||(data.entries[date]={})}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),1800)}
function sleepHours(bed,wake){if(!bed||!wake)return null;let [bh,bm]=bed.split(':').map(Number),[wh,wm]=wake.split(':').map(Number);let mins=(wh*60+wm)-(bh*60+bm);if(mins<=0)mins+=1440;return +(mins/60).toFixed(2)}
function dateRange(n=14,end=today()){const arr=[];const d=new Date(end+'T12:00:00');for(let i=n-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);arr.push(x.toISOString().slice(0,10))}return arr}
function movingAverage(values,window=7){return values.map((_,i)=>{const slice=values.slice(Math.max(0,i-window+1),i+1).filter(v=>v!=null);return slice.length?slice.reduce((a,b)=>a+b,0)/slice.length:null})}
function formatMinutes(m){return `${Math.floor(m/60)}h ${m%60}m`}

function scoreForDate(date){
  const e=data.entries[date]||{};
  const parts=[];
  if(e.sleepHours!=null)parts.push(Math.min(100,e.sleepHours/goals.sleep*100));
  if(e.movement!=null)parts.push(Math.min(100,e.movement/goals.movement*100));
  if(e.eatingScore!=null)parts.push(e.eatingScore/goals.eating*100);
  if(e.screenMinutes!=null){
    parts.push(e.screenMinutes===0?100:Math.max(0,Math.min(100,(data.settings.screenGoalMinutes/e.screenMinutes)*100)));
  }
  return parts.length?Math.round(parts.reduce((a,b)=>a+b,0)/parts.length):0;
}

function renderQuick(){
  const e=data.entries[$('#entryDate').value]||{};
  const items=[
    ['Sleep',e.sleepHours!=null?e.sleepHours.toFixed(1)+' h':'—','8 h',colors.sleep],
    ['Weight',e.weight!=null?e.weight.toFixed(1)+' lb':'—','Next 360',colors.weight],
    ['Move',e.movement!=null?e.movement+' min':'—','30 min',colors.movement],
    ['Screen',e.screenMinutes!=null?formatMinutes(e.screenMinutes):'—','Goal 2 h',colors.screen],
    ['Eating',e.eatingScore!=null?e.eatingScore+'/4':'—','Ideal choices',colors.eating],
    ['Blood pressure',e.systolic!=null&&e.diastolic!=null?`${e.systolic}/${e.diastolic}`:'—','Weekly · 120/80',colors.bp]
  ];
  $('#quickGrid').innerHTML=items.map(x=>`<div class="quick-card" style="--accent:${x[3]}"><span>${x[0]}</span><strong>${x[1]}</strong><span>${x[2]}</span></div>`).join('');
  const score=scoreForDate($('#entryDate').value);
  $('#dailyScore').textContent=score;
  $('#dailyRing').style.setProperty('--score',score);
  $('#heroMessage').textContent=score>=85?'Excellent balance today.':score>=65?'A solid day—keep building.':score>0?'A few small wins can lift the day.':'Log a habit to begin your day.';
}

function renderInputs(){
  const e=data.entries[$('#entryDate').value]||{};
  $('#bedTime').value=e.bed||'';
  $('#wakeTime').value=e.wake||'';
  $('#weightInput').value=e.weight??'';
  $('#movementInput').value=e.movement??'';
  $('#screenHours').value=e.screenMinutes!=null?Math.floor(e.screenMinutes/60):'';
  $('#screenMinutes').value=e.screenMinutes!=null?e.screenMinutes%60:'';
  $('#systolicInput').value=e.systolic??'';
  $('#diastolicInput').value=e.diastolic??'';
  renderEating(e.eating||{});
  updateBadges(e);
}

function updateBadges(e){
  $('#sleepToday').textContent=e.sleepHours!=null?e.sleepHours.toFixed(1)+' h':'Not logged';
  $('#weightToday').textContent=e.weight!=null?e.weight.toFixed(1)+' lb':'Not logged';
  $('#movementToday').textContent=e.movement!=null?e.movement+' min':'Not logged';
  $('#screenToday').textContent=e.screenMinutes!=null?formatMinutes(e.screenMinutes):'Not logged';
  $('#eatingToday').textContent=e.eatingScore!=null?e.eatingScore+'/4':'Not logged';
  $('#bpToday').textContent=e.systolic!=null&&e.diastolic!=null?`${e.systolic}/${e.diastolic}`:'Not logged';
}

const questions=[
  ['breakfast','Protein shake for breakfast?',true],
  ['stops','Stops after work?',false],
  ['snacks','Snacks after kids’ bedtime?',false],
  ['lunch','Lunch for tomorrow prepped?',true]
];

function renderEating(ans){
  $('#eatingQuestions').innerHTML=questions.map(([key,question])=>`<div class="question"><p>${question}</p><div class="segmented" data-q="${key}"><button data-v="true" class="${ans[key]===true?'active':''}">Yes</button><button data-v="false" class="${ans[key]===false?'active':''}">No</button></div></div>`).join('');
  document.querySelectorAll('.segmented button').forEach(button=>{
    button.onclick=()=>{
      const group=button.parentElement;
      group.querySelectorAll('button').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
    };
  });
}

function renderWeightGoals(){
  const latest=Object.entries(data.entries).filter(([,e])=>e.weight!=null).sort(([a],[b])=>a.localeCompare(b)).at(-1)?.[1].weight;
  const milestones=[];
  for(let value=360;value>=230;value-=10)milestones.push(value);
  $('#weightGoalTrack').innerHTML=milestones.map(value=>`<span class="goal-dot ${latest!=null&&latest<=value?'reached':''}" title="${value} lb"></span>`).join('');
  const next=milestones.find(value=>latest==null||latest>value)||230;
  $('#nextWeightGoal').textContent=next+' lb';
}

function drawChart(canvasId,series,options={}){
  const canvas=$(canvasId);
  if(!canvas)return;
  const ctx=canvas.getContext('2d'),ratio=devicePixelRatio||1,width=canvas.clientWidth,height=180;
  canvas.width=width*ratio;canvas.height=height*ratio;ctx.scale(ratio,ratio);ctx.clearRect(0,0,width,height);
  const valid=series.flatMap(item=>item.data).filter(value=>value!=null);
  if(!valid.length){ctx.fillStyle='#98a2b3';ctx.font='14px -apple-system';ctx.fillText('No data yet',14,30);return}
  let min=options.min??Math.min(...valid),max=options.max??Math.max(...valid);
  if(options.includeValues){
    min=Math.min(min,...options.includeValues);
    max=Math.max(max,...options.includeValues);
  }
  if(min===max){if(options.min!=null)max=min+1;else{min-=1;max+=1}}
  const pad={l:34,r:12,t:16,b:28},chartWidth=width-pad.l-pad.r,chartHeight=height-pad.t-pad.b;
  ctx.strokeStyle='#e4e7ec';ctx.lineWidth=1;
  for(let i=0;i<4;i++){const yy=pad.t+chartHeight*i/3;ctx.beginPath();ctx.moveTo(pad.l,yy);ctx.lineTo(width-pad.r,yy);ctx.stroke()}
  const x=i=>pad.l+(series[0].data.length===1?chartWidth/2:chartWidth*i/(series[0].data.length-1));
  const y=value=>pad.t+chartHeight-(value-min)/(max-min)*chartHeight;
  (options.goalLines||[]).forEach(goal=>{
    ctx.strokeStyle=goal.color;ctx.lineWidth=1.5;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(pad.l,y(goal.value));ctx.lineTo(width-pad.r,y(goal.value));ctx.stroke();ctx.setLineDash([]);
  });
  series.forEach(item=>{
    ctx.strokeStyle=item.color;ctx.lineWidth=item.dashed?2:3;ctx.setLineDash(item.dashed?[6,5]:[]);
    ctx.beginPath();let started=false;
    item.data.forEach((value,index)=>{
      if(value==null){started=false;return}
      if(!started){ctx.moveTo(x(index),y(value));started=true}else ctx.lineTo(x(index),y(value));
    });
    ctx.stroke();ctx.setLineDash([]);
    if(!item.dashed)item.data.forEach((value,index)=>{if(value==null)return;ctx.fillStyle=item.color;ctx.beginPath();ctx.arc(x(index),y(value),3,0,Math.PI*2);ctx.fill()});
  });
  ctx.fillStyle='#98a2b3';ctx.font='10px -apple-system';
  const labels=options.labels||[];
  [0,Math.floor((labels.length-1)/2),labels.length-1].forEach(index=>{if(index>=0&&labels[index])ctx.fillText(labels[index],Math.max(0,x(index)-12),height-8)});
  ctx.fillText(max.toFixed(options.decimals??0),2,pad.t+4);
  ctx.fillText(min.toFixed(options.decimals??0),2,pad.t+chartHeight);
}

function renderCharts(){
  const dates=dateRange(14),labels=dates.map(fmtDate),values=key=>dates.map(date=>data.entries[date]?.[key]??null);
  const sleep=values('sleepHours');
  drawChart('#sleepChart',[{data:sleep,color:colors.sleep},{data:movingAverage(sleep),color:'#111827',dashed:true}],{labels,min:0,max:12});
  const weight=values('weight');
  drawChart('#weightChart',[{data:movingAverage(weight,7),color:colors.weight}],{labels});
  const movement=values('movement');
  const movementMax=Math.max(30,...movement.filter(value=>value!=null));
  drawChart('#movementChart',[{data:movement,color:colors.movement},{data:movingAverage(movement),color:'#111827',dashed:true}],{labels,min:0,max:movementMax});
  const screen=values('screenMinutes').map(value=>value==null?null:value/60);
  drawChart('#screenChart',[{data:screen,color:colors.screen},{data:movingAverage(screen),color:'#111827',dashed:true}],{labels,min:0,includeValues:[2],goalLines:[{value:2,color:colors.screen}],decimals:1});
  const systolic=values('systolic'),diastolic=values('diastolic');
  drawChart('#bpChart',[
    {data:systolic,color:colors.bp},
    {data:movingAverage(systolic,4),color:colors.bp,dashed:true},
    {data:diastolic,color:colors.bp2},
    {data:movingAverage(diastolic,4),color:colors.bp2,dashed:true}
  ],{labels,min:40,max:180,includeValues:[80,120],goalLines:[{value:120,color:colors.bp},{value:80,color:colors.bp2}]});
  const eating=values('eatingScore');
  drawChart('#eatingChart',[{data:eating,color:colors.eating},{data:movingAverage(eating),color:'#111827',dashed:true}],{labels,min:0,max:4});
}

function weekDates(endDate=today()){
  const date=new Date(endDate+'T12:00:00'),day=date.getDay();
  date.setDate(date.getDate()-day);
  return Array.from({length:7},(_,index)=>{const item=new Date(date);item.setDate(date.getDate()-6+index);return item.toISOString().slice(0,10)});
}

function generateReport(){
  const days=weekDates();
  const scores=days.map(scoreForDate);
  const logged=scores.filter(value=>value>0);
  const dailyComponent=Math.round(scores.reduce((sum,value)=>sum+value,0)/7);
  const bpReadings=days.map(date=>data.entries[date]).filter(item=>item?.systolic!=null&&item?.diastolic!=null);
  const bpTracked=bpReadings.length>0;

  // BP is not part of any daily score. For the weekly score, tracking it at
  // least once contributes 10 points to the weekly score. Daily habits supply the other 90%.
  const overall=Math.round(dailyComponent*0.90+(bpTracked?10:0));

  const average=key=>{
    const values=days.map(date=>data.entries[date]?.[key]).filter(value=>value!=null);
    return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null;
  };
  const sleep=average('sleepHours'),movement=average('movement'),eating=average('eatingScore'),screen=average('screenMinutes');
  const latestBP=bpReadings.at(-1);
  const suggestions=[];
  if(sleep==null||sleep<7.5)suggestions.push('Move bedtime earlier by 15–30 minutes and prepare the CPAP before winding down.');
  if(movement==null||movement<30)suggestions.push('Use a 10-minute minimum: three short movement blocks still reach the daily goal.');
  if(eating==null||eating<3)suggestions.push('Prioritize tomorrow’s lunch prep and create a clear “kitchen closed” cue after the kids’ bedtime.');
  if(screen!=null&&screen>data.settings.screenGoalMinutes)suggestions.push('Choose a fixed evening phone-off time to move toward the two-hour goal.');
  if(!bpTracked)suggestions.push('Take and log one blood-pressure reading this week.');
  if(!suggestions.length)suggestions.push('Maintain the current routine and focus on consistency rather than adding new goals.');

  const grade=overall>=90?'A':overall>=80?'B':overall>=70?'C':overall>=60?'D':'Needs focus';
  $('#weeklyScore').textContent=overall;
  $('#weeklyRing').style.setProperty('--score',overall);
  $('#reportTitle').textContent=`${grade} · ${fmtDate(days[0])}–${fmtDate(days[6])}`;
  $('#reportContent').innerHTML=
    `<div class="report-item"><strong>Week score: ${overall}/100</strong>${logged.length} of 7 days contained scored daily entries. Blood pressure: ${bpTracked?'tracked (+10 weekly points)':'not tracked (0 of 10 weekly points)'}.</div>`+
    `<div class="report-item"><strong>Averages</strong>Sleep ${sleep==null?'—':sleep.toFixed(1)+' h'} · Movement ${movement==null?'—':Math.round(movement)+' min'} · Eating ${eating==null?'—':eating.toFixed(1)+'/4'} · Screen ${screen==null?'—':formatMinutes(Math.round(screen))} · BP ${latestBP?latestBP.systolic+'/'+latestBP.diastolic:'—'}</div>`+
    `<div class="report-item"><strong>Week ahead</strong>${suggestions.slice(0,4).map(item=>'• '+item).join('<br>')}</div>`;
  data.reports[days[6]]={score:overall,bpTracked,suggestions,generated:new Date().toISOString()};
  localStorage.setItem(KEY,JSON.stringify(data));
  return overall;
}

function renderAll(){renderQuick();renderInputs();renderWeightGoals();renderCharts();generateReport()}

document.addEventListener('click',event=>{
  const saveType=event.target.dataset.save;
  if(!saveType)return;
  const date=$('#entryDate').value,item=entry(date);
  if(saveType==='sleep'){item.bed=$('#bedTime').value;item.wake=$('#wakeTime').value;item.sleepHours=sleepHours(item.bed,item.wake)}
  if(saveType==='weight')item.weight=parseFloat($('#weightInput').value)||null;
  if(saveType==='movement')item.movement=Math.max(0,parseInt($('#movementInput').value)||0);
  if(saveType==='screen')item.screenMinutes=(parseInt($('#screenHours').value)||0)*60+(parseInt($('#screenMinutes').value)||0);
  if(saveType==='bp'){
    const systolic=parseInt($('#systolicInput').value),diastolic=parseInt($('#diastolicInput').value);
    if(!systolic||!diastolic){toast('Enter both blood pressure values');return}
    item.systolic=systolic;item.diastolic=diastolic;
  }
  if(saveType==='eating'){
    item.eating={};
    questions.forEach(([key])=>{
      const active=document.querySelector(`.segmented[data-q="${key}"] .active`);
      if(active)item.eating[key]=active.dataset.v==='true';
    });
    item.eatingScore=questions.reduce((score,[key,,ideal])=>score+(item.eating[key]===ideal?1:0),0);
  }
  save();toast('Saved');
});

$('#entryDate').value=today();
$('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
$('#entryDate').onchange=()=>{renderInputs();renderQuick()};
$('#refreshReport').onclick=()=>{generateReport();toast('Weekly report updated')};
$('#jumpLog').onclick=event=>{event.preventDefault();document.querySelector('.section-heading').scrollIntoView()};
$('#screenCsv').onchange=async event=>{
  const text=await event.target.files[0].text();
  const lines=text.trim().split(/\r?\n/);
  for(const line of lines.slice(1)){
    const [date,hours,minutes]=line.split(',').map(value=>value.trim());
    if(/^\d{4}-\d{2}-\d{2}$/.test(date))entry(date).screenMinutes=(+hours||0)*60+(+minutes||0);
  }
  save();toast('Screen Time CSV imported');
};
$('#exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');
  link.href=URL.createObjectURL(blob);link.download=`danielmente-backup-${today()}.json`;link.click();URL.revokeObjectURL(link.href);
};
$('#importData').onchange=async event=>{
  try{
    const imported=JSON.parse(await event.target.files[0].text());
    data={...defaultData,...imported,entries:imported.entries||{},reports:imported.reports||{},settings:{...defaultData.settings,...(imported.settings||{}),screenGoalMinutes:120}};
    save();toast('Data restored');
  }catch{toast('Could not restore file')}
};
$('#resetBtn').onclick=()=>{if(confirm('Delete all danielmente data from this device?')){data=structuredClone(defaultData);save();toast('Data reset')}};
$('#notifyBtn').onclick=async()=>{
  if(!('Notification'in window)){toast('Notifications are not supported here');return}
  const permission=await Notification.requestPermission();
  if(permission==='granted'){
    data.settings.notifications=true;save();
    new Notification('danielmente',{body:'Sunday reports are enabled. Open the app each Sunday to generate your weekly report.'});
    toast('Notifications enabled');
  }else toast('Notification permission was not granted');
};
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;$('#installBtn').classList.remove('hidden')});
$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}else toast('In Safari, use Share → Add to Home Screen')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
if(new Date().getDay()===0&&data.settings.notifications&&Notification.permission==='granted'){
  setTimeout(()=>new Notification('Your danielmente weekly report is ready',{body:'Open the app to review your score and plan the week ahead.'}),1500);
}
renderAll();
