export const MARKETS = [
  {id:'SoCal',name:'Southern California',sites:['Beverly Hills Flagship','Beverly Hills Satellite','Santa Monica','Manhattan Beach']},
  {id:'NorCal',name:'Northern California',sites:['San Francisco','Palo Alto']},
  {id:'FL',name:'Florida',sites:['Boca Raton','Palm Beach','Coral Gables']},
  {id:'NY',name:'New York',sites:['Upper East Side','Tribeca','Hamptons','Fifth Avenue','Gramercy','Hudson Yards']}
];
export const SITES = MARKETS.flatMap(market=>market.sites);
export const getMarket = site=>MARKETS.find(market=>market.sites.includes(site))||null;
export const getMarketSites = marketId=>MARKETS.find(market=>market.id===marketId)?.sites||[];
export const ROLES = ['Lab Technician', 'Lab Supervisor', 'RN', 'RN Lead', 'Medical Assistant', 'Manager', 'Other'];
export const ELEMENTS = [
  'Direct observation of routine patient testing and specimen handling',
  'Monitoring recording and reporting of patient results',
  'Review of intermediate results, QC, PT and maintenance records',
  'Direct observation of maintenance and instrument function checks',
  'Assessment of test performance with known or previously analyzed samples',
  'Assessment of problem-solving skills'
];
export const TRAINING_ELEMENTS = [
  'Reviewed the current SOP, manufacturer IFU and safety requirements',
  'Demonstrated specimen collection and handling',
  'Reviewed analyzer setup, operation and maintenance',
  'Completed QC demonstration and interpretation',
  'Reviewed result reporting and troubleshooting',
  'Trainer reviewed the checklist with the employee'
];
export const PHASES = [
  {id:'initial_training',label:'Initial training',short:'Training',hint:'Before independent testing'},
  {id:'initial_competency',label:'Initial competency',short:'Initial check',hint:'Competency before independent testing'},
  {id:'six_month',label:'6-month competency',short:'6-month',hint:'First-year follow-up assessment'},
  {id:'annual',label:'Annual competency',short:'Annual',hint:'Repeat every year'}
];
export const PLATFORMS = [
  {id:'sofia2',name:'Sofia 2',group:'Rapid testing',mode:'waived',source:'Sofia 2 Training Checklist.docx'},
  {id:'piccolo',name:'Piccolo Xpress',group:'Chemistry',mode:'nonwaived',source:'Piccolo_Training.pdf'},
  {id:'sysmex',name:'Sysmex pocH-100i',group:'Hematology',mode:'nonwaived',source:'Sysmex_pocH_100i_Training.pdf'},
  {id:'spotfire',name:'BioFire SPOTFIRE R/ST',group:'Molecular',mode:'nonwaived',source:'BioFire_SPOTFIRE_RST_Training.pdf'},
  {id:'torch',name:'BioFire TORCH',group:'Molecular',mode:'nonwaived',source:'BioFire_TORCH_Training.pdf'},
  {id:'pathfast',name:'PATHFAST',group:'Cardiac / coagulation',mode:'nonwaived',source:null},
  {id:'triage',name:'Triage MeterPro',group:'Cardiac / coagulation',mode:'nonwaived',source:null},
  {id:'clinitek',name:'Clinitek Status+ UA',group:'Urinalysis',mode:'waived',source:'Clinitek_Status_UA_Training.pdf'},
  {id:'clinitek_hcg',name:'Clinitek Urine hCG',group:'Urinalysis',mode:'waived',source:'Clinitek_Status_Urine_hCG_Training.pdf'},
  {id:'abbott_hiv',name:'Abbott HIV Combo',group:'Rapid testing',mode:'nonwaived',source:'Abbott_HIV_Combo_Training.pdf'},
  {id:'coagsense',name:'Coag-Sense',group:'Coagulation',mode:'site-policy',source:'Coag_Sense_Training.pdf'},
  {id:'mono',name:'McKesson Mononucleosis',group:'Rapid testing',mode:'waived',source:'McKesson_Consult_Mononucleosis_Training.pdf'},
  {id:'drug_cup',name:'McKesson Drugs of Abuse Cup',group:'Rapid testing',mode:'waived',source:'McKesson_Drugs_of_Abuse_Test_Cup_Training.pdf'},
  {id:'quickvue_flu',name:'QuickVue Influenza A+B',group:'Rapid testing',mode:'waived',source:'Quidel_QuickVue_Influenza_AB_Training.pdf'},
  {id:'quickvue_rsv',name:'QuickVue RSV',group:'Rapid testing',mode:'waived',source:'Quidel_QuickVue_RSV_Training.pdf'},
  {id:'quickvue_covid',name:'QuickVue SARS Antigen',group:'Rapid testing',mode:'waived',source:'Quidel_QuickVue_SARS_Antigen_Training.pdf'},
  {id:'quickvue_strep',name:'QuickVue Strep A',group:'Rapid testing',mode:'waived',source:'Quidel_QuickVue_Strep_A_Training.pdf'},
  {id:'febridx',name:'FebriDx',group:'Rapid testing',mode:'nonwaived',source:null},
  {id:'safety',name:'Lab Safety / OSHA',group:'General',mode:'site-policy',source:'Sollis_Health_Procedure_Package.pdf'}
];
export const uuid = () => globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2)}`;
export const isoToday = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export function datePlus(date,months){const [y,m,d]=date.split('-').map(Number);const last=new Date(y,m-1+months+1,0).getDate();const dt=new Date(y,m-1+months,Math.min(d,last));return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;}
export const daysUntil = date => Math.round((new Date(`${date}T12:00:00`)-new Date(`${isoToday()}T12:00:00`))/86400000);
export function dateLabel(date){if(!date)return 'Not set';return new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
export const getPlatform = id => PLATFORMS.find(p=>p.id===id)||{name:id,group:'Other',mode:'site-policy'};
export const getPhase = id => PHASES.find(p=>p.id===id)||{label:id,short:id};
export function statusOf(assessment,employee,threshold=30){
 if (assessment.completed_at) return 'complete';
 if(employee?.status==='offboarded')return 'archived';
 const n=daysUntil(assessment.due_date);
 if(n<0)return 'overdue';
 if(n<=threshold)return 'due';
 return assessment.started_at?'progress':'upcoming';
}
export function createStages(enrollment, now=isoToday()){
  const base=enrollment.first_testing_date;
  const stages=[
    ['initial_training',datePlus(base,0),0],
    ['initial_competency',datePlus(base,0),0],
    ['six_month',datePlus(base,6),0]
  ];
  const yNow=Number(now.slice(0,4)), yBase=Number(base.slice(0,4));
  const years=Math.max(2,Math.min(25,yNow-yBase+2));
  for(let i=1;i<=years;i++)stages.push(['annual',datePlus(base,12*i),i]);
  return stages.map(([phase,due_date,cycle])=>({
    id:uuid(),enrollment_id:enrollment.id,phase,cycle,due_date,
    started_at:null,completed_at:null,assessor:'',elements:[],notes:'',outcome:'pending',created_at:new Date().toISOString()
  }));
}
export function demoData(){
 const today=isoToday();
 const people=[
  ['Jordan Lee','Lab Technician','Beverly Hills Flagship',-420],
  ['Taylor Morgan','Lab Technician','Santa Monica',-190],
  ['Alex Rivera','RN','Manhattan Beach',-35],
  ['Morgan Chen','Lab Technician','Beverly Hills Satellite',-690],
  ['Casey Johnson','Lab Technician','Santa Monica',-355],
  ['Avery Patel','RN Lead','Manhattan Beach',-90],
  ['Riley Smith','Lab Technician','San Francisco',-800],
  ['Jamie Park','Lab Technician','Upper East Side',-20]
 ];
 const shift=(n)=>{let d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
 const employees=people.map(([name,role,site,days],i)=>({id:uuid(),name,email:'',role,site,hire_date:shift(days),status:'active',offboard_reason:null,offboarded_at:null,created_at:new Date().toISOString()}));
 const enrollments=[];const assessments=[];
 const map=[['sofia2','piccolo','sysmex'],['sofia2','spotfire','clinitek'],['sofia2','spotfire'],['piccolo','sysmex','pathfast'],['sofia2','clinitek','triage'],['sofia2','spotfire'],['piccolo','sysmex'],['sofia2','quickvue_strep']];
 employees.forEach((e,i)=>map[i].forEach((pid,j)=>{
  const en={id:uuid(),employee_id:e.id,platform_id:pid,first_testing_date:shift(people[i][3]+j*12),complexity:getPlatform(pid).mode,created_at:new Date().toISOString()};enrollments.push(en);
  const stages=createStages(en);
  stages.forEach(a=>{
   if(daysUntil(a.due_date)<-45 && (i+j)%4!==0){a.completed_at=shift(Math.min(-1,daysUntil(a.due_date)+12));a.assessor='Demo assessor';a.elements=[0,1,2,3,4,5];a.outcome='competent';}
  });assessments.push(...stages);
 }));
 return {employees,enrollments,assessments,documents:[],settings:{threshold:30}};
}