// Cloud mode: Supabase Auth + PostgREST + private Supabase Storage (no secret keys in browser).
const config=window.COMPETENCY_CONFIG||{};
export const cloudEnabled=Boolean(config.SUPABASE_URL&&config.SUPABASE_ANON_KEY&&!config.DEMO_MODE);
const URLBASE=(config.SUPABASE_URL||'').replace(/\/$/,'');
const sessionKey='lab-competency-sb-session';
let auth=null;
function currentSession(){if(auth)return auth;try{auth=JSON.parse(sessionStorage.getItem(sessionKey)||'null');}catch{}return auth;}
export function cloudUser(){return currentSession()?.user||null;}
export async function signIn(email,password){const res=await fetch(`${URLBASE}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:config.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const value=await res.json();if(!res.ok)throw Error(value.msg||value.error_description||value.message||'Sign-in failed');auth=value;sessionStorage.setItem(sessionKey,JSON.stringify(value));return value.user;}
export function signOut(){auth=null;sessionStorage.removeItem(sessionKey);}
async function token(){let s=currentSession();if(!s)return null;const exp=s.expires_at || Math.floor(Date.now()/1000)+(s.expires_in||0);if(exp>Math.floor(Date.now()/1000)+45)return s.access_token;
 const res=await fetch(`${URLBASE}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:config.SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
 if(!res.ok){signOut();throw Error('Session expired. Sign in again.');}
 s=await res.json();auth=s;sessionStorage.setItem(sessionKey,JSON.stringify(s));return s.access_token;}
async function request(path,options={}){const access=await token();if(!access)throw Error('Sign in required');const res=await fetch(`${URLBASE}${path}`,{...options,headers:{apikey:config.SUPABASE_ANON_KEY,authorization:`Bearer ${access}`,...options.headers}});
 if(!res.ok){let e={};try{e=await res.json()}catch{}throw Error(e.message||e.error_description||`Request failed: ${res.status}`);}if(options.raw)return res;const ct=res.headers.get('content-type')||'';return ct.includes('application/json')?res.json():null;}
export async function verifyAccess(){const user=cloudUser();if(!user)return null;const rows=await request(`/rest/v1/app_users?user_id=eq.${encodeURIComponent(user.id)}&active=eq.true&select=user_id,role,allowed_sites`);if(rows.length===0)throw Error('Your account is not authorized for this lab system. Ask the administrator to add your user ID.');return rows[0];}
async function fetchAll(table){const out=[];for(let offset=0;offset<50000;offset+=1000){const rows=await request(`/rest/v1/${table}?select=*&limit=1000&offset=${offset}&order=created_at.asc`);out.push(...rows);if(rows.length<1000)return out;}throw Error('Too many records for this version. Contact the administrator.');}
export async function fetchCloud(){const [employees,enrollments,assessments,documents]=await Promise.all(['employees','enrollments','assessments','documents'].map(fetchAll));return {employees,enrollments,assessments,documents,settings:{threshold:30}};}
export async function insertCloud(table,records){const rows=await request(`/rest/v1/${table}`,{method:'POST',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(records)});return rows;}
export async function updateCloud(table,id,patch){const rows=await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(patch)});if(!rows?.length)throw Error('Update rejected or record not found');return rows[0];}
export async function removeCloud(table,id){await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:{Prefer:'return=minimal'}});}
export async function uploadCloud(path,file){const access=await token();if(!access)throw Error('Sign in required');const resp=await fetch(`${URLBASE}/storage/v1/object/competency-files/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{apikey:config.SUPABASE_ANON_KEY,authorization:`Bearer ${access}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!resp.ok){const t=await resp.text();throw Error(`Upload failed: ${t.slice(0,250)}`);}}
export async function readCloudFile(path){const res=await request(`/storage/v1/object/authenticated/competency-files/${path.split('/').map(encodeURIComponent).join('/')}`,{raw:true});return res.blob();}
export async function deleteCloudFile(path){await request(`/storage/v1/object/competency-files/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE'});}