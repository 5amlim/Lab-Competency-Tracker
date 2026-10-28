// Supabase Edge Function: send-reminders
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
//          REMINDER_TO (comma-separated), REMINDER_FROM (verified domain),
//          CRON_SECRET, APP_URL.
// Invoke only from the GitHub Action with X-Cron-Secret. Never expose secret in client.
const cors = {'Content-Type':'application/json'};
const env=(name:string)=>Deno.env.get(name)||'';
const localToday=()=>{
  const bits=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const get=(type:string)=>bits.find(b=>b.type===type)?.value||'00';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const diff=(a:string,b:string)=>Math.round((Date.parse(`${a}T12:00:00Z`)-Date.parse(`${b}T12:00:00Z`))/86400000);
const rest=async(path:string,init:RequestInit={})=>{
 const response=await fetch(`${env('SUPABASE_URL')}/rest/v1/${path}`,{
 ...init,headers:{apikey:env('SUPABASE_SERVICE_ROLE_KEY'),authorization:`Bearer ${env('SUPABASE_SERVICE_ROLE_KEY')}`,'Content-Type':'application/json',...init.headers}});
 if(!response.ok)throw Error(`${response.status}: ${await response.text()}`);
 return response.status===204?null:response.json();
};
Deno.serve(async(req)=>{
 if(req.method!=='POST')return new Response(JSON.stringify({error:'Method not allowed'}),{status:405,headers:cors});
 if(!env('CRON_SECRET')||req.headers.get('x-cron-secret')!==env('CRON_SECRET'))return new Response(JSON.stringify({error:'Unauthorized'}),{status:401,headers:cors});
 try{
  const required=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','RESEND_API_KEY','REMINDER_TO','REMINDER_FROM','APP_URL'];
  for(const k of required)if(!env(k))throw Error(`Missing configured secret: ${k}`);
  const today=localToday();
  const records=await rest('assessments?select=id,due_date,completed_at,enrollments!inner(employee_id,employees!inner(status))&completed_at=is.null&enrollments.employees.status=eq.active&limit=1000');
  const existing=await rest('reminder_logs?select=assessment_id,reminder_key&limit=1000');
  const sentSet=new Set((existing||[]).map((l:{assessment_id:string;reminder_key:string})=>`${l.assessment_id}:${l.reminder_key}`));
  const pending:{assessment_id:string;reminder_key:string;sent_on:string}[]=[];
  const grouped={due30:0,due14:0,due7:0,due0:0,overdue:0};
  for(const r of records||[]){
    const days=diff(r.due_date,today);
    let key:string|null=null;
    if([30,14,7,0].includes(days))key=`due-${days}`;
    else if(days<0 && (Math.abs(days)-1)%7===0)key=`overdue-${Math.floor((Math.abs(days)-1)/7)}`;
    if(!key||sentSet.has(`${r.id}:${key}`))continue;
    pending.push({assessment_id:r.id,reminder_key:key,sent_on:today});
    if(days===30)grouped.due30++;else if(days===14)grouped.due14++;else if(days===7)grouped.due7++;else if(days===0)grouped.due0++;else grouped.overdue++;
  }
  if(!pending.length)return new Response(JSON.stringify({sent:false,reason:'No new thresholds due'}),{headers:cors});
  const recipients=env('REMINDER_TO').split(',').map(x=>x.trim()).filter(Boolean);
  const counts=[['30 days away',grouped.due30],['14 days away',grouped.due14],['7 days away',grouped.due7],['Due today',grouped.due0],['Overdue follow-up',grouped.overdue]]
   .filter(([,n])=>n).map(([label,n])=>`<li>${label}: <b>${n}</b></li>`).join('');
  const link=new URL(env('APP_URL'));
  if(link.protocol!=='https:')throw Error('APP_URL must use HTTPS');
  const resp=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env('RESEND_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({from:env('REMINDER_FROM'),to:recipients,subject:`Lab competency deadlines: ${pending.length} follow-up items`,html:`<h2>Lab competency reminder</h2><p>There are ${pending.length} competency milestones at reminder thresholds.</p><ul>${counts}</ul><p><a href="${link.href}">Open the private competency workspace</a> to review assigned employees and deadlines.</p><p>No employee details are included in this email.</p>`})});
  if(!resp.ok)throw Error(`Email provider failed: ${resp.status} ${await resp.text()}`);
  await rest('reminder_logs',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates'},body:JSON.stringify(pending)});
  return new Response(JSON.stringify({sent:true,count:pending.length}),{headers:cors});
 }catch(error){console.error(error);return new Response(JSON.stringify({error:'Reminder delivery failed; check function logs'}),{status:500,headers:cors});}
});