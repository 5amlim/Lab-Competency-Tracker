import {demoData,uuid} from './data.js';
const KEY='lab-competency-v1';
const DB='lab-competency-files-v1';
const STORE='files';
export function loadLocal(){try{const stored=localStorage.getItem(KEY);if(stored){const v=JSON.parse(stored);if(v.employees&&v.enrollments&&v.assessments&&v.documents){
  // Update only unchanged fictional starter records from the original demo.
  const starterSites={'Jordan Lee':['Beverly Hills','Beverly Hills Flagship'],'Morgan Chen':['Beverly Hills','Beverly Hills Satellite'],'Jamie Park':['New York','Upper East Side']};
  let updated=false;
  v.employees.forEach(person=>{
    const pair=starterSites[person.name];
    if(pair&&person.email===''&&person.site===pair[0]){person.site=pair[1];updated=true;}
  });
  if(updated)saveLocal(v);
  return v;
 }}}catch(e){console.warn('Local data unavailable',e);}const v=demoData();saveLocal(v);return v;}
export function saveLocal(v){localStorage.setItem(KEY,JSON.stringify(v));}
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
export async function putFile(key,file){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(file,key);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error);});}
export async function getFile(key){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readonly');const r=t.objectStore(STORE).get(key);r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error);});}
export async function removeFile(key){const db=await openDb();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(key);t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error);});}
export async function wipeLocal(){localStorage.removeItem(KEY);const db=await openDb();db.close();return new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(DB);r.onsuccess=resolve;r.onerror=()=>reject(r.error)});}
export function exportJson(v){const safe={...v,info:'Metadata only. File contents stored in IndexedDB are not included. Use private cloud storage for production.'};const blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`lab-competency-metadata-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}