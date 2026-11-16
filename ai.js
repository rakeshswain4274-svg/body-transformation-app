/* Transform Pro AI v3 - local-first AI assistant; no API key in browser */
'use strict';
const AI_SETTINGS_KEY = 'transform_ai_config_v3';
let aiBusy = false;
function aiConfig() { try { return JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || '{}'); } catch { return {}; } }
function aiStoreConfig(cfg) { localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(cfg)); }
function aiRecent() {
  const today = localISO();
  const dates = Array.from({length:7}, (_,i)=>addDays(today,i-6));
  const days = dates.map(date=>({date,...(state.days[date]||{})}));
  const measured = state.measurements.filter(m=>m.date<=today).slice(-2);
  const num = (arr, key)=>arr.reduce((s,d)=>s+(Number(d[key])||0),0);
  const workouts = days.filter(d=>d.workout?.completedAt).length;
  const sleeps = days.filter(d=>Number(d.sleepHours)>0);
  return {window:'last 7 days',workouts,daysLogged:days.filter(d=>state.days[d.date]).length,
    averageWaterMl:Math.round(num(days,'waterMl')/7),
    averageSteps:Math.round(num(days,'steps')/7),
    averageSleepHours:sleeps.length?Math.round(num(sleeps,'sleepHours')/sleeps.length*10)/10:null,
    recentWeightKg:measured.length?Number(measured.at(-1).weightKg):null,
    weightChangeKg:measured.length>1?Math.round((Number(measured.at(-1).weightKg)-Number(measured[0].weightKg))*10)/10:null,
    latestWaistCm:measured.length?measured.at(-1).waistCm:null,
    goalWeightKg:state.profile.goalWeightKg,workoutMinutes:state.profile.workoutMinutes,
    equipment:state.profile.equipment,programWeek:getProgramPosition().week,
    dailyWaterTargetMl:state.settings.waterGoalMl};
}
function aiOfflineAdvice(kind, summary) {
  const lines=[];
  if(kind==='week') {
    lines.push('WEEKLY REVIEW (OFFLINE)',`Workouts completed: ${summary.workouts} in 7 days.`,`Average water: ${summary.averageWaterMl} mL/day.`);
    if(summary.averageSleepHours!==null) lines.push(`Average logged sleep: ${summary.averageSleepHours} hours.`);
    if(summary.weightChangeKg!==null) lines.push(`Change between latest two weigh-ins: ${summary.weightChangeKg>0?'+':''}${summary.weightChangeKg} kg (not necessarily a weekly change).`);
    lines.push(summary.workouts<2?'Aim for 2 comfortable sessions next week; build consistency before intensity.':'Keep your routine consistent. Increase difficulty only when form and recovery are good.');
  } else if(kind==='tomorrow') {
    const tomorrow=addDays(localISO(),1), session=getSessionForDate(tomorrow);
    lines.push('TOMORROW PLAN (OFFLINE)',`${formatDate(tomorrow)}: ${session.title||session.name||'Scheduled session'}.`,`Program week: ${summary.programWeek}. Allow up to ${summary.workoutMinutes} minutes.`,'Use comfortable intensity, warm up first and stop for pain, dizziness or unusual breathlessness.');
  } else if(kind==='meal') {
    lines.push('MEAL IDEA (OFFLINE)','Dinner: 2 chapatis, a serving of chicken or eggs, cooked vegetables and plain curd.','Adjust portions for appetite and overall energy needs. Nutrition values are not calculated here.');
  } else {
    lines.push('COACH TIP (OFFLINE)','For your next workout, prioritize technique and consistency over speed.',summary.averageSleepHours!==null&&summary.averageSleepHours<7?'Your logged sleep average is below 7 hours. Prioritize recovery.':'Record sleep, water and exercise effort to improve recommendations.');
  }
  if(summary.daysLogged<4) lines.push('Note: Fewer than four days have records; insights may be incomplete.');
  return lines.join('\n\n');
}
function aiHistory() {return Array.isArray(state.aiHistory)?state.aiHistory:[];}
function renderAICoach(){
  const cfg=aiConfig(), summary=aiRecent(), history=aiHistory();
  $('#view-ai').innerHTML=`<div class="ai-card"><div class="ai-small">TRANSFORM PRO AI · VERSION 3.0</div><h2>Your personal fitness coach</h2><p>Works offline with rule-based insights. Connect your own secure AI backend for online AI-generated advice.</p><div class="ai-actions"><button class="ai-button" data-ai="week">Analyse my week</button><button class="ai-button" data-ai="tomorrow">Plan tomorrow</button><button class="ai-button secondary" data-ai="meal">Meal suggestion</button><button class="ai-button secondary" data-ai="coach">Coach tip</button></div></div>
  <div class="ai-card"><h3>7-day snapshot</h3><p>${summary.workouts} workouts · ${summary.averageWaterMl} mL average water/day · ${summary.averageSleepHours??'—'} hours average logged sleep</p><p class="ai-small">Calculated locally from your records. Missing entries are not treated as completed activities.</p></div>
  <div class="ai-card"><h3>Ask your coach</h3><textarea id="aiQuestion" class="ai-input" rows="3" maxlength="500" placeholder="Example: How can I improve my workout consistency?"></textarea><button class="ai-button" data-ai="ask">Ask coach</button><p class="ai-small">Offline: a general rule-based tip. Online: sends your question and optional 7-day summary only after you approve.</p></div>
  <div class="ai-card"><h3>Secure AI connection (optional)</h3><p>Requires a separately deployed, authenticated backend. Never enter an OpenAI API key here.</p><label class="ai-small" for="aiEndpoint">Backend HTTPS URL</label><input class="ai-input" id="aiEndpoint" type="url" placeholder="https://your-worker.workers.dev" value="${escapeHTML(cfg.endpoint||'')}"><label class="ai-small" for="aiToken">Personal access token (not an API key)</label><input class="ai-input" id="aiToken" type="password" placeholder="Your backend access token" value=""><label><input id="aiShareSummary" type="checkbox" ${cfg.shareSummary?'checked':''}> Include 7-day fitness summary in online requests</label><div class="ai-actions"><button class="ai-button secondary" data-ai="save-config">Save connection</button><button class="ai-button secondary" data-ai="disconnect">Disconnect</button></div><p class="ai-small">Token is held only for this app session, not saved in browser storage. Re-enter it after reopening the app.</p></div>
  <div class="ai-card"><h3>Coach response</h3><div id="aiResult" class="ai-response" role="status">Select an insight above. No personal records are sent automatically.</div></div>
  <div class="ai-card"><h3>Saved insights (${history.length})</h3>${history.slice(-5).reverse().map(h=>`<p><strong>${escapeHTML(h.title)}</strong> · ${escapeHTML(h.date)}<br><span class="ai-small">${escapeHTML(h.text.slice(0,220))}${h.text.length>220?'…':''}</span></p>`).join('')||'<p>No insights saved yet.</p>'}<button class="ai-button secondary" data-ai="clear-history">Delete AI history</button></div>`;
}
let aiSessionToken='';
async function aiSaveInsight(title,text){state.aiHistory=aiHistory();state.aiHistory.push({date:localISO(),title,text});state.aiHistory=state.aiHistory.slice(-30);await persistState();}
async function aiRun(kind){
  const result=$('#aiResult'); if(!result||aiBusy)return;
  const summary=aiRecent(), cfg=aiConfig(), question=$('#aiQuestion')?.value.trim()||'';
  if(kind==='ask'&&!question){result.textContent='Enter a question first.';return;}
  const labels={week:'Weekly review',tomorrow:'Tomorrow plan',meal:'Meal suggestion',coach:'Coach tip',ask:'Coach answer'};
  if(!cfg.endpoint||!navigator.onLine){const text=aiOfflineAdvice(kind,summary)+(kind==='ask'?'\n\nYour specific question needs the optional online AI connection.':'');result.textContent=text;await aiSaveInsight(labels[kind],text);return;}
  if(!aiSessionToken){result.textContent='Enter your personal backend access token and tap Save connection. No data has been sent.';return;}
  const sendSummary=cfg.shareSummary===true;
  if(!confirm(`Send ${kind==='ask'?'your question':'your request'}${sendSummary?' and your 7-day fitness summary':''} to your configured AI backend?`))return;
  aiBusy=true;result.textContent='Connecting securely…';
  try {
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),25000);
    let response;
    try{response=await fetch(cfg.endpoint.replace(/\/$/,'') ,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${aiSessionToken}`},body:JSON.stringify({kind,question,summary:sendSummary?summary:null}),signal:controller.signal});}finally{clearTimeout(timeout);}
    if(!response.ok)throw Error(`Server returned ${response.status}`);
    const data=await response.json();if(typeof data.answer!=='string'||!data.answer.trim())throw Error('Invalid server response');
    const text=data.answer.slice(0,8000);result.textContent=text;await aiSaveInsight(labels[kind],text);
  }catch(err){result.textContent=`Online coach unavailable (${err.message}). No automatic retry.\n\n${aiOfflineAdvice(kind,summary)}`;}
  finally{aiBusy=false;}
}
document.addEventListener('click',async e=>{
 const btn=e.target.closest('[data-ai]');if(!btn)return;
 const action=btn.dataset.ai;
 if(action==='save-config'){
   const endpoint=$('#aiEndpoint').value.trim();
   if(endpoint&&(!/^https:\/\/[^\s]+$/.test(endpoint)||!/^https:\/\//.test(endpoint))){$('#aiResult').textContent='Use a valid HTTPS URL.';return;}
   aiSessionToken=$('#aiToken').value.trim();
   aiStoreConfig({endpoint,shareSummary:$('#aiShareSummary').checked});$('#aiResult').textContent='Connection settings saved. The access token is session-only. No data has been sent.';
 } else if(action==='disconnect'){aiSessionToken='';localStorage.removeItem(AI_SETTINGS_KEY);renderAICoach();}
 else if(action==='clear-history'){if(confirm('Delete all locally saved AI insights?')){state.aiHistory=[];await persistState();renderAICoach();}}
 else await aiRun(action);
});
