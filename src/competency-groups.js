// Pure grouping and sort rules for the competency list.
// Filtering occurs before grouping so an employee's counts reflect current filters.
export function groupAssessmentRecords(records, getEnrollment, getEmployee, sort='deadline',today='2026-10-27'){
 const byEmployee=new Map();
 for(const assessment of records){
  const enrollment=getEnrollment(assessment.enrollment_id);
  if(!enrollment)continue;
  const employee=getEmployee(enrollment.employee_id);
  if(!employee)continue;
  let group=byEmployee.get(employee.id);
  if(!group){group={employee,records:[],overdue:0,dueSoon:0,completed:0,open:0,earliest:null};byEmployee.set(employee.id,group);}
  group.records.push(assessment);
  if(assessment.completed_at){group.completed++;continue;}
  if(employee.status==='offboarded')continue;
  group.open++;
  if(assessment.due_date<today)group.overdue++;
  else{
    const delta=Math.round((Date.parse(assessment.due_date+'T12:00:00')-Date.parse(today+'T12:00:00'))/86400000);
    if(delta<=30)group.dueSoon++;
  }
  if(!group.earliest||assessment.due_date<group.earliest)group.earliest=assessment.due_date;
 }
 const groups=[...byEmployee.values()];
 for(const group of groups){
  group.records.sort((a,b)=>(Boolean(a.completed_at)-Boolean(b.completed_at))||a.due_date.localeCompare(b.due_date));
 }
 const byName=(a,b)=>a.employee.name.localeCompare(b.employee.name);
 groups.sort((a,b)=>{
  if(sort==='name')return byName(a,b);
  if(sort==='site')return a.employee.site.localeCompare(b.employee.site)||byName(a,b);
  if(sort==='overdue')return b.overdue-a.overdue||(a.earliest||'9999').localeCompare(b.earliest||'9999')||byName(a,b);
  return (a.earliest||'9999').localeCompare(b.earliest||'9999')||byName(a,b);
 });
 return groups;
}
