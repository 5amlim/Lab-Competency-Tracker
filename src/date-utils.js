// Pure date helpers shared by the calendar and tests.
const pad=n=>String(n).padStart(2,'0');
export const isoFor=(year,month,day)=>`${year}-${pad(month)}-${pad(day)}`;
export function dateParts(value){
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');
 if(!match)return null;
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
 if(month<1||month>12||day<1||day>new Date(year,month,0).getDate())return null;
 return {year,month,day};
}
export function moveMonth(year,month,offset){
 const date=new Date(year,month-1+offset,1);
 return {year:date.getFullYear(),month:date.getMonth()+1};
}
