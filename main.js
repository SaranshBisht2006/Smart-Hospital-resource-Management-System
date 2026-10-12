import { createClient } from '@supabase/supabase-js';
import './style.css';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(envUrl && envKey && !envUrl.includes('YOUR_PROJECT_ID') && !envKey.includes('YOUR_SUPABASE'));
const supabase = configured ? createClient(envUrl, envKey) : null;

const state = { session: null, section: 'overview', rows: {}, busy: false };
const app = document.querySelector('#app');

const modules = {
  patients: {
    title: 'Patients', icon: '♙', table: 'patients', description: 'Patient records and contact information',
    fields: [
      {name:'full_name',label:'Full name',required:true},
      {name:'age',label:'Age',type:'number',required:true},
      {name:'gender',label:'Gender',type:'select',options:['Female','Male','Other','Prefer not to say'],required:true},
      {name:'phone',label:'Phone',required:true},
      {name:'blood_group',label:'Blood group',type:'select',options:['Unknown','A+','A-','B+','B-','AB+','AB-','O+','O-']},
      {name:'condition_note',label:'Condition / notes',type:'textarea'}
    ], columns:['full_name','age','gender','phone','blood_group']
  },
  doctors: {
    title: 'Doctors', icon: '✚', table: 'doctors', description: 'Manage the doctor directory',
    fields: [
      {name:'full_name',label:'Doctor name',required:true},
      {name:'specialty',label:'Specialty',required:true},
      {name:'phone',label:'Phone'},
      {name:'email',label:'Email',type:'email'},
      {name:'available',label:'Available',type:'select',options:['true','false'],required:true}
    ], columns:['full_name','specialty','phone','email','available']
  },
  appointments: {
    title: 'Appointments', icon: '▦', table: 'appointments', description: 'Book and track appointments',
    fields: [
      {name:'patient_id',label:'Patient',type:'patient',required:true},
      {name:'doctor_id',label:'Doctor',type:'doctor',required:true},
      {name:'appointment_at',label:'Date and time',type:'datetime-local',required:true},
      {name:'status',label:'Status',type:'select',options:['scheduled','completed','cancelled'],required:true},
      {name:'notes',label:'Notes',type:'textarea'}
    ], columns:['patient_id','doctor_id','appointment_at','status','notes']
  },
  beds: {
    title: 'Bed management', icon: '▤', table: 'beds', description: 'Track ward beds and occupancy',
    fields: [
      {name:'bed_number',label:'Bed number',required:true},
      {name:'ward',label:'Ward',required:true},
      {name:'status',label:'Status',type:'select',options:['available','occupied','maintenance'],required:true},
      {name:'patient_id',label:'Assigned patient',type:'patientOptional'}
    ], columns:['bed_number','ward','status','patient_id']
  },
  inventory: {
    title: 'Medicine inventory', icon: '✚', table: 'medicine_inventory', description: 'Monitor stock and low-stock levels',
    fields: [
      {name:'medicine_name',label:'Medicine name',required:true},
      {name:'quantity',label:'Quantity',type:'number',required:true},
      {name:'reorder_level',label:'Reorder level',type:'number',required:true},
      {name:'unit',label:'Unit (tablets, bottles, etc.)',required:true},
      {name:'expiry_date',label:'Expiry date',type:'date'}
    ], columns:['medicine_name','quantity','reorder_level','unit','expiry_date']
  },
  equipment: {
    title: 'Equipment', icon: '⚙', table: 'equipment', description: 'Track essential hospital equipment',
    fields: [
      {name:'equipment_name',label:'Equipment name',required:true},
      {name:'asset_code',label:'Asset code',required:true},
      {name:'status',label:'Status',type:'select',options:['available','in_use','maintenance'],required:true},
      {name:'location',label:'Location'}
    ], columns:['equipment_name','asset_code','status','location']
  },
  requests: {
    title: 'Resource queue', icon: '⇅', table: 'resource_requests', description: 'Prioritise resource requests (smaller number = higher priority)',
    fields: [
      {name:'resource_name',label:'Resource requested',required:true},
      {name:'requested_by',label:'Requested by',required:true},
      {name:'priority',label:'Priority (1 is highest)',type:'number',required:true},
      {name:'status',label:'Status',type:'select',options:['pending','processed','rejected'],required:true},
      {name:'details',label:'Details',type:'textarea'}
    ], columns:['resource_name','requested_by','priority','status','details']
  }
};

function esc(value='') {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function notify(message, type='success') {
  const box = document.querySelector('#toast');
  if (!box) return;
  box.textContent = message;
  box.className = `toast show ${type}`;
  setTimeout(() => box.className = 'toast', 3200);
}
function initials(email='') { return email.slice(0,2).toUpperCase() || 'CF'; }

function renderSetup() {
  app.innerHTML = `
    <main class="setup-wrap">
      <div class="brand-mark">✚</div>
      <p class="eyebrow">SMART HEALTH RESOURCE MANAGEMENT</p>
      <h1>CareFlow</h1>
      <p class="muted lead">A clean, practical OS + DBMS project for managing hospital resources.</p>
      <section class="setup-card">
        <h2>Connect your Supabase project</h2>
        <p>Almost ready. Add your project URL and publishable/anon key to a local <code>.env</code> file.</p>
        <ol>
          <li>Create a project at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Supabase Dashboard</a>.</li>
          <li>Open <b>SQL Editor</b> and run <code>supabase/schema.sql</code> from this project.</li>
          <li>Copy <code>.env.example</code> to <code>.env</code> and fill in the Project URL and publishable/anon key.</li>
          <li>Run <code>npm install</code> and <code>npm run dev</code> again.</li>
        </ol>
        <div class="notice">Do not put a Supabase <b>service_role</b> key in the frontend or commit your <code>.env</code> file.</div>
      </section>
    </main>`;
}

function shell() {
  const items = [
    ['overview','▦','Overview'], ['patients','♙','Patients'], ['doctors','✚','Doctors'],
    ['appointments','▣','Appointments'], ['beds','▤','Beds'], ['inventory','⚕','Medicine stock'],
    ['equipment','⚙','Equipment'], ['requests','⇅','Resource queue'], ['scheduler','◷','OS scheduler']
  ];
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark small">✚</span><div><strong>CareFlow</strong><small>HEALTH RESOURCE OS</small></div></div>
        <div class="nav-label">WORKSPACE</div>
        <nav>${items.map(([id,icon,label])=>`<button class="nav-item ${state.section===id?'active':''}" data-section="${id}"><span>${icon}</span>${label}</button>`).join('')}</nav>
        <div class="sidebar-bottom"><div class="secure-dot"></div><span>Supabase connected</span><small>Student demo</small></div>
      </aside>
      <main class="main-area">
        <header class="topbar"><div><span class="eyebrow">CARE MANAGEMENT / ${esc(state.section.toUpperCase())}</span><h1>${state.section==='overview'?'Good day, team':state.section==='scheduler'?'OS Scheduling Lab':modules[state.section]?.title || 'CareFlow'}</h1></div>
          <div class="profile"><div class="avatar">${initials(state.session?.user?.email)}</div><div class="profile-info"><b>${esc(state.session?.user?.email || 'Staff user')}</b><small>Authenticated user</small></div><button id="logout" class="btn btn-quiet">Sign out</button></div></header>
        <section id="content" class="content"></section>
        <footer>CareFlow · PBL Project · Operating Systems + DBMS <span>Demo data only — not for real patient care.</span></footer>
      </main>
      <div id="toast" class="toast"></div>
    </div>`;
  app.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section; shell(); loadSection();}));
  document.querySelector('#logout').addEventListener('click', async()=>{await supabase.auth.signOut();});
}

function renderAuth() {
  app.innerHTML = `
    <main class="auth-layout">
      <section class="auth-visual"><div class="brand"><span class="brand-mark">✚</span><div><strong>CareFlow</strong><small>SMART HEALTH RESOURCE MANAGEMENT</small></div></div>
        <div class="visual-copy"><span class="pill">PBL · OS + DBMS</span><h1>Better resource<br><em>flow starts here.</em></h1><p>A simple workspace to organise patients, appointments, beds, medicine stock and equipment — with an OS scheduling lab built in.</p>
          <div class="visual-stats"><div><b>07</b><span>Management modules</span></div><div><b>04</b><span>CPU algorithms</span></div><div><b>01</b><span>Connected database</span></div></div></div>
        <div class="visual-foot">Designed for learning · Built for demonstration</div></section>
      <section class="auth-panel"><div class="auth-form-wrap"><div class="mobile-brand">✚ CareFlow</div><p class="eyebrow">WELCOME TO CAREFLOW</p><h2 id="auth-title">Sign in to your workspace</h2><p class="muted" id="auth-subtitle">Use your registered account to continue.</p>
        <form id="auth-form"><label>Email address<input name="email" type="email" placeholder="you@example.com" required autocomplete="email"></label><label>Password<input name="password" type="password" placeholder="At least 6 characters" required minlength="6" autocomplete="current-password"></label><button class="btn btn-primary full" id="auth-submit">Sign in <span>→</span></button></form>
        <p class="auth-switch"><span id="switch-text">New to CareFlow?</span> <button id="switch-auth" class="text-button">Create an account</button></p>
        <div class="auth-note">Use fictional data only. This student project is not a clinical system.</div></div></section>
      <div id="toast" class="toast"></div>
    </main>`;
  let signup = false;
  const form = document.querySelector('#auth-form');
  const switcher = document.querySelector('#switch-auth');
  const change = () => {
    signup = !signup;
    document.querySelector('#auth-title').textContent = signup ? 'Create your account' : 'Sign in to your workspace';
    document.querySelector('#auth-subtitle').textContent = signup ? 'Register with an email and password.' : 'Use your registered account to continue.';
    document.querySelector('#auth-submit').innerHTML = signup ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    document.querySelector('#switch-text').textContent = signup ? 'Already registered?' : 'New to CareFlow?';
    switcher.textContent = signup ? 'Sign in instead' : 'Create an account';
  };
  switcher.addEventListener('click', change);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form), email = fd.get('email'), password = fd.get('password');
    const btn = document.querySelector('#auth-submit'); btn.disabled = true; btn.textContent = 'Please wait…';
    try {
      const result = signup ? await supabase.auth.signUp({email,password}) : await supabase.auth.signInWithPassword({email,password});
      if (result.error) throw result.error;
      if (signup && !result.data.session) notify('Account created. Check your email to confirm, then sign in.');
      else notify(signup ? 'Account created.' : 'Welcome back.');
    } catch(err) { notify(err.message || 'Authentication failed.', 'error'); }
    finally { btn.disabled=false; btn.innerHTML=signup?'Create account <span>→</span>':'Sign in <span>→</span>'; }
  });
}

async function getRows(table, order='created_at', ascending=false) {
  const {data,error}=await supabase.from(table).select('*').order(order,{ascending}).limit(200);
  if(error) throw error;
  state.rows[table]=data||[];
  return data||[];
}
function byId(table,id) { return (state.rows[table]||[]).find(r=>r.id===id); }
function nameFor(table,id) { return byId(table,id)?.full_name || '—'; }

async function loadSection() {
  const content=document.querySelector('#content'); if(!content)return;
  content.innerHTML='<div class="loading"><span class="spinner"></span>Loading your workspace…</div>';
  try {
    if(state.section==='overview') return await renderOverview();
    if(state.section==='scheduler') return renderScheduler();
    const mod=modules[state.section];
    if(!mod) return;
    const related = [];
    if(state.section==='appointments'||state.section==='beds') {
      related.push(getRows('patients','full_name',true));
      if(state.section==='appointments') related.push(getRows('doctors','full_name',true));
    }
    const dataPromise=getRows(mod.table);
    const results=await Promise.all([dataPromise,...related]);
    renderModule(mod,results[0]);
  } catch(err) { content.innerHTML=`<div class="error-card"><h3>Could not load this section</h3><p>${esc(err.message)}</p><button class="btn btn-secondary" id="retry">Try again</button></div>`; document.querySelector('#retry')?.addEventListener('click',loadSection); }
}
async function renderOverview() {
  const content=document.querySelector('#content');
  const tables=['patients','doctors','appointments','beds','medicine_inventory','equipment','resource_requests'];
  const all=await Promise.all(tables.map(t=>getRows(t)));
  const [patients,doctors,appointments,beds,medicines,equipment,requests]=all;
  const stats=[
    ['Total patients',patients.length,'Registered records','♙','blue'],
    ['Available doctors',doctors.filter(d=>d.available===true || d.available==='true').length,'Ready for appointments','✚','purple'],
    ['Appointments',appointments.filter(a=>a.status==='scheduled').length,'Currently scheduled','▣','green'],
    ['Beds available',beds.filter(b=>b.status==='available').length,`${beds.filter(b=>b.status==='occupied').length} occupied`,'▤','orange']
  ];
  const low=medicines.filter(m=>m.quantity<=m.reorder_level);
  const recent=[...appointments].sort((a,b)=>new Date(b.appointment_at)-new Date(a.appointment_at)).slice(0,5);
  content.innerHTML=`
    <div class="welcome-row"><div><h2>Your hospital at a glance</h2><p>Here’s the current picture of your resources and activity.</p></div><span class="live-chip"><i></i> Database connected</span></div>
    <div class="stats-grid">${stats.map(([label,val,sub,icon,color])=>`<article class="stat-card"><div class="stat-top"><span>${label}</span><span class="stat-icon ${color}">${icon}</span></div><strong>${val}</strong><small>${sub}</small></article>`).join('')}</div>
    <div class="overview-grid"><section class="panel"><div class="panel-heading"><div><h3>Recent appointments</h3><p>Latest scheduled visits</p></div><button class="text-button" data-jump="appointments">View all →</button></div>
      ${recent.length?`<div class="table-wrap"><table><thead><tr><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Status</th></tr></thead><tbody>${recent.map(a=>`<tr><td>${esc(nameFor('patients',a.patient_id))}</td><td>${esc(nameFor('doctors',a.doctor_id))}</td><td>${esc(new Date(a.appointment_at).toLocaleString())}</td><td>${badge(a.status)}</td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-state"><span>▣</span><b>No appointments yet</b><p>Add your first appointment to see it here.</p><button class="btn btn-secondary" data-jump="appointments">Create appointment</button></div>`}
    </section><section class="panel"><div class="panel-heading"><div><h3>Needs attention</h3><p>Items worth checking</p></div><span class="counter">${low.length+requests.filter(r=>r.status==='pending').length}</span></div>
      <div class="attention-list">${low.length?low.slice(0,4).map(m=>`<div class="attention-item"><span class="attention-icon orange">!</span><div><b>${esc(m.medicine_name)}</b><small>Stock: ${m.quantity} ${esc(m.unit)} · Reorder at ${m.reorder_level}</small></div><span class="tag warning">Low stock</span></div>`).join(''):`<div class="attention-item"><span class="attention-icon green">✓</span><div><b>Medicine stock looks good</b><small>No items below reorder level.</small></div></div>`}
      ${requests.filter(r=>r.status==='pending').slice(0,3).map(r=>`<div class="attention-item"><span class="attention-icon purple">⇅</span><div><b>${esc(r.resource_name)}</b><small>Priority ${r.priority} · ${esc(r.requested_by)}</small></div><span class="tag warning">Pending</span></div>`).join('')}
      </div></section></div>
    <section class="panel quick-panel"><div class="panel-heading"><div><h3>Quick actions</h3><p>Jump straight to a task</p></div></div><div class="quick-actions">
      ${[['patients','＋','Add patient'],['appointments','▣','Book appointment'],['beds','▤','Manage beds'],['inventory','⚕','Update stock'],['scheduler','◷','Run OS scheduler']].map(([id,icon,label])=>`<button class="quick-action" data-jump="${id}"><span>${icon}</span><b>${label}</b><i>↗</i></button>`).join('')}
    </div></section>`;
  content.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.jump;shell();loadSection();}));
}
function badge(value='') {
  const v=String(value).toLowerCase();
  const cls=['available','completed','processed','true'].includes(v)?'good':['occupied','scheduled','pending','in_use'].includes(v)?'warning':['cancelled','rejected','maintenance','false'].includes(v)?'bad':'neutral';
  return `<span class="tag ${cls}">${esc(value.replaceAll('_',' '))}</span>`;
}
function displayValue(mod,row,key) {
  const val=row[key];
  if(key==='patient_id') return esc(nameFor('patients',val));
  if(key==='doctor_id') return esc(nameFor('doctors',val));
  if(key==='appointment_at') return val?esc(new Date(val).toLocaleString()):'—';
  if(key==='expiry_date') return val?esc(val):'—';
  if(key==='available') return badge(String(val));
  if(['status'].includes(key)) return badge(val);
  return esc(val ?? '—');
}
function renderModule(mod, rows) {
  const content=document.querySelector('#content');
  content.innerHTML=`
    <div class="module-toolbar"><div><h2>${mod.title}</h2><p>${mod.description}. ${rows.length} record${rows.length===1?'':'s'} shown.</p></div><button class="btn btn-primary" id="add-record">＋ Add ${mod.title.replace(/s$/,'').replace('Bed management','bed').replace('Medicine inventory','medicine').replace('Resource queue','request')}</button></div>
    <section class="panel"><div class="table-wrap"><table><thead><tr>${mod.columns.map(c=>`<th>${esc(c.replaceAll('_',' '))}</th>`).join('')}<th>Action</th></tr></thead><tbody>
      ${rows.length?rows.map(row=>`<tr>${mod.columns.map(c=>`<td>${displayValue(mod,row,c)}</td>`).join('')}<td><button class="delete-btn" data-delete="${row.id}" aria-label="Delete record">Delete</button></td></tr>`).join(''):`<tr><td colspan="${mod.columns.length+1}"><div class="empty-state compact"><span>${mod.icon}</span><b>No records yet</b><p>Use the button above to add your first record.</p></div></td></tr>`}
      </tbody></table></div></section>
    <div id="modal-root"></div>`;
  document.querySelector('#add-record').addEventListener('click',()=>openModal(mod));
  content.querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',()=>deleteRow(mod,b.dataset.delete)));
}
function fieldHtml(f) {
  let input='';
  if(f.type==='select') input=`<select name="${f.name}" ${f.required?'required':''}>${f.options.map(o=>`<option value="${esc(o)}">${esc(o==='true'?'Available':o==='false'?'Unavailable':o.replaceAll('_',' '))}</option>`).join('')}</select>`;
  else if(f.type==='patient'||f.type==='patientOptional') input=`<select name="${f.name}" ${f.required?'required':''}><option value="">${f.required?'Choose patient':'Not assigned'}</option>${(state.rows.patients||[]).map(p=>`<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select>`;
  else if(f.type==='doctor') input=`<select name="${f.name}" required><option value="">Choose doctor</option>${(state.rows.doctors||[]).filter(d=>d.available).map(d=>`<option value="${d.id}">${esc(d.full_name)} — ${esc(d.specialty)}</option>`).join('')}</select>`;
  else if(f.type==='textarea') input=`<textarea name="${f.name}" rows="3" ${f.required?'required':''}></textarea>`;
  else input=`<input name="${f.name}" type="${f.type||'text'}" ${f.required?'required':''} ${f.type==='number'?'min="0"':''}>`;
  return `<label>${esc(f.label)}${f.required?' <span class="required">*</span>':''}${input}</label>`;
}
async function openModal(mod) {
  if((mod.table==='appointments'||mod.table==='beds') && !state.rows.patients) await getRows('patients','full_name',true);
  if(mod.table==='appointments' && !state.rows.doctors) await getRows('doctors','full_name',true);
  const root=document.querySelector('#modal-root');
  root.innerHTML=`<div class="modal-backdrop"><section class="modal"><div class="modal-heading"><div><p class="eyebrow">NEW RECORD</p><h2>Add ${esc(mod.title)}</h2></div><button class="close-modal" aria-label="Close">×</button></div>
    <form id="record-form" class="record-form">${mod.fields.map(fieldHtml).join('')}<div class="modal-actions"><button type="button" class="btn btn-quiet close-modal">Cancel</button><button class="btn btn-primary" id="save-record">Save record →</button></div></form></section></div>`;
  root.querySelectorAll('.close-modal').forEach(b=>b.addEventListener('click',()=>root.innerHTML=''));
  root.querySelector('.modal-backdrop').addEventListener('click',e=>{if(e.target.classList.contains('modal-backdrop'))root.innerHTML='';});
  root.querySelector('#record-form').addEventListener('submit',async e=>{
    e.preventDefault(); const btn=root.querySelector('#save-record');btn.disabled=true;btn.textContent='Saving…';
    const fd=new FormData(e.target), payload={};
    for(const f of mod.fields) {
      let v=fd.get(f.name);
      if(v===''||v===null) { if(f.type==='patientOptional')payload[f.name]=null; continue; }
      if(f.type==='number') v=Number(v);
      if(f.name==='available')v=v==='true';
      if(f.name==='appointment_at')v=new Date(v).toISOString();
      payload[f.name]=v;
    }
    try {
      const {error}=await supabase.from(mod.table).insert(payload);
      if(error)throw error;
      root.innerHTML='';notify('Record saved successfully.');await loadSection();
    } catch(err){notify(err.message||'Could not save record.','error');btn.disabled=false;btn.textContent='Save record →';}
  });
}
async function deleteRow(mod,id) {
  if(!confirm('Delete this record? This cannot be undone.'))return;
  try { const {error}=await supabase.from(mod.table).delete().eq('id',id);if(error)throw error;notify('Record deleted.');await loadSection(); }
  catch(err){notify(err.message||'Delete failed.','error');}
}

function renderScheduler() {
  const content=document.querySelector('#content');
  content.innerHTML=`
    <div class="module-toolbar"><div><h2>CPU Scheduling Simulator</h2><p>Compare scheduling algorithms using a small process set. Calculations run in your browser.</p></div><span class="pill dark">OS CONCEPTS</span></div>
    <div class="scheduler-layout"><section class="panel"><div class="panel-heading"><div><h3>Process input</h3><p>Enter arrival time, burst time and priority</p></div></div>
      <div class="process-input-wrap"><table class="process-table"><thead><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr></thead><tbody id="process-rows"></tbody></table></div>
      <div class="process-actions"><button id="add-process" class="btn btn-secondary">＋ Add process</button><label class="quantum-label">Time quantum <input id="quantum" type="number" min="1" value="2"></label></div>
      <div class="algorithm-grid">${['FCFS','SJF','Priority','Round Robin'].map(a=>`<button class="algorithm-btn" data-algo="${a}"><b>${a}</b><span>${({FCFS:'First Come, First Served',SJF:'Shortest Job First',Priority:'Lowest number first', 'Round Robin':'Time-sliced execution'})[a]}</span><i>Run →</i></button>`).join('')}</div>
    </section><section class="panel result-panel"><div class="panel-heading"><div><h3>Simulation result</h3><p id="result-subtitle">Choose an algorithm to see its result.</p></div></div><div id="schedule-result" class="empty-state"><span>◷</span><b>Ready to simulate</b><p>Your Gantt chart and metrics will appear here.</p></div></section></div>`;
  let processes=[{pid:'P1',arrival:0,burst:5,priority:2},{pid:'P2',arrival:1,burst:3,priority:1},{pid:'P3',arrival:2,burst:4,priority:3}];
  const body=document.querySelector('#process-rows');
  const draw=()=>body.innerHTML=processes.map((p,i)=>`<tr><td><b>${p.pid}</b></td><td><input type="number" min="0" value="${p.arrival}" data-i="${i}" data-k="arrival"></td><td><input type="number" min="1" value="${p.burst}" data-i="${i}" data-k="burst"></td><td><input type="number" min="1" value="${p.priority}" data-i="${i}" data-k="priority"></td><td><button class="delete-btn" data-remove="${i}">×</button></td></tr>`).join('');
  draw();
  body.addEventListener('change',e=>{const i=Number(e.target.dataset.i),k=e.target.dataset.k;if(k&&processes[i])processes[i][k]=Math.max(k==='burst'?1:0,Number(e.target.value)||0);});
  body.addEventListener('click',e=>{const i=Number(e.target.dataset.remove);if(e.target.dataset.remove!==undefined&&processes.length>1){processes.splice(i,1);draw();}});
  document.querySelector('#add-process').addEventListener('click',()=>{processes.push({pid:`P${processes.length+1}`,arrival:0,burst:1,priority:processes.length+1});draw();});
  content.querySelectorAll('[data-algo]').forEach(b=>b.addEventListener('click',()=>runScheduling(b.dataset.algo,processes,Number(document.querySelector('#quantum').value)||1)));
}
function runScheduling(algo, input, quantum) {
  const ps=input.map(p=>({...p,remaining:p.burst,completion:0,first:null})).sort((a,b)=>a.arrival-b.arrival||a.pid.localeCompare(b.pid));
  let timeline=[],time=0,done=0,guard=0;
  const add=(p,start,end)=>{if(end>start)timeline.push({pid:p?.pid||'Idle',start,end});};
  if(algo==='FCFS') {
    for(const p of ps){if(time<p.arrival){add(null,time,p.arrival);time=p.arrival;}p.first=time;add(p,time,time+p.burst);time+=p.burst;p.completion=time;}
  } else if(algo==='SJF'||algo==='Priority') {
    const waiting=new Set(ps);
    while(waiting.size&&guard++<10000){const ready=[...waiting].filter(p=>p.arrival<=time);
      if(!ready.length){const next=Math.min(...[...waiting].map(p=>p.arrival));add(null,time,next);time=next;continue;}
      ready.sort((a,b)=>(algo==='SJF'?a.burst-b.burst:a.priority-b.priority)||a.arrival-b.arrival||a.pid.localeCompare(b.pid));
      const p=ready[0];p.first=time;add(p,time,time+p.burst);time+=p.burst;p.completion=time;waiting.delete(p);
    }
  } else {
    const queue=[];let idx=0;
    while((idx<ps.length||queue.length)&&guard++<10000){
      if(!queue.length&&idx<ps.length&&time<ps[idx].arrival){add(null,time,ps[idx].arrival);time=ps[idx].arrival;}
      while(idx<ps.length&&ps[idx].arrival<=time)queue.push(ps[idx++]);
      const p=queue.shift();if(!p)continue;
      if(p.first===null)p.first=time;
      const run=Math.min(quantum,p.remaining);add(p,time,time+run);time+=run;p.remaining-=run;
      while(idx<ps.length&&ps[idx].arrival<=time)queue.push(ps[idx++]);
      if(p.remaining>0)queue.push(p);else p.completion=time;
    }
  }
  const metrics=ps.map(p=>({...p,turnaround:p.completion-p.arrival,waiting:p.completion-p.arrival-p.burst}));
  const avgWait=metrics.reduce((s,p)=>s+p.waiting,0)/metrics.length;
  const avgTurn=metrics.reduce((s,p)=>s+p.turnaround,0)/metrics.length;
  const result=document.querySelector('#schedule-result');
  document.querySelector('#result-subtitle').textContent=`${algo} · ${metrics.length} processes completed`;
  const total=Math.max(1,timeline[timeline.length-1]?.end||1);
  result.className='schedule-output';
  result.innerHTML=`<div class="metric-pair"><div><small>Average waiting time</small><b>${avgWait.toFixed(2)}</b></div><div><small>Average turnaround</small><b>${avgTurn.toFixed(2)}</b></div></div>
    <h4>Gantt chart</h4><div class="gantt">${timeline.map(t=>`<div class="gantt-block ${t.pid==='Idle'?'idle':''}" style="flex:${Math.max(.1,t.end-t.start)}"><b>${esc(t.pid)}</b><small>${t.start}–${t.end}</small></div>`).join('')}</div>
    <div class="time-scale"><span>0</span><span>End time: ${timeline[timeline.length-1]?.end||0}</span></div>
    <div class="table-wrap metrics-table"><table><thead><tr><th>Process</th><th>CT</th><th>TAT</th><th>WT</th></tr></thead><tbody>${metrics.map(p=>`<tr><td>${p.pid}</td><td>${p.completion}</td><td>${p.turnaround}</td><td>${p.waiting}</td></tr>`).join('')}</tbody></table></div>
    <p class="formula-note"><b>CT</b> = Completion time · <b>TAT</b> = CT − Arrival time · <b>WT</b> = TAT − Burst time</p>`;
}

async function init() {
  if(!configured) return renderSetup();
  const {data:{session}}=await supabase.auth.getSession();
  state.session=session;
  supabase.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session){shell();loadSection();}else renderAuth();});
  if(session){shell();loadSection();}else renderAuth();
}
init();
