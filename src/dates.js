// Branded calendar popover for native date inputs. The original date input
// keeps its name/value/required semantics for existing forms.
import {isoFor,dateParts,moveMonth} from './date-utils.js';
let active = null;
const todayParts=()=>{const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1,day:d.getDate()};};
const format = value => {
  const p=dateParts(value);
  if(!p)return 'Choose a date';
  return new Date(p.year,p.month-1,p.day).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
};
const monthName=(year,month)=>new Date(year,month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
function closeCalendar(focus=false){
 if(!active)return;
 const {popup,trigger}=active;
 popup.remove();
 trigger.classList.remove('is-open');
 trigger.setAttribute('aria-expanded','false');
 active=null;
 if(focus&&trigger.isConnected)trigger.focus();
}
export const dismissCalendars=()=>closeCalendar(false);
function placeCalendar(popup,trigger){
 const rect=trigger.getBoundingClientRect();
 const width=Math.min(320,window.innerWidth-20);
 const left=Math.max(10,Math.min(rect.left,window.innerWidth-width-10));
 const height=Math.min(popup.scrollHeight,440,window.innerHeight-24);
 const flip=window.innerHeight-rect.bottom<height+12 && rect.top>=height+12;
 popup.style.width=width+'px';
 popup.style.maxHeight=(window.innerHeight-24)+'px';
 popup.style.left=left+'px';
 popup.style.top=(flip?Math.max(12,rect.top-height-8):Math.min(rect.bottom+8,window.innerHeight-height-12))+'px';
}
function drawCalendar(){
 if(!active)return;
 const {popup,input,trigger}=active;
 const year=active.year,month=active.month;
 popup.innerHTML='';
 const header=document.createElement('div');header.className='app-calendar-header';
 const heading=document.createElement('strong');heading.textContent=monthName(year,month);
 const prevYear=document.createElement('button');prevYear.type='button';prevYear.className='app-calendar-nav year-jump';prevYear.setAttribute('aria-label','Previous year');prevYear.textContent='«';
 const back=document.createElement('button');back.type='button';back.className='app-calendar-nav';back.setAttribute('aria-label','Previous month');back.textContent='‹';
 const next=document.createElement('button');next.type='button';next.className='app-calendar-nav';next.setAttribute('aria-label','Next month');next.textContent='›';
 const nextYear=document.createElement('button');nextYear.type='button';nextYear.className='app-calendar-nav year-jump';nextYear.setAttribute('aria-label','Next year');nextYear.textContent='»';
 const middle=document.createElement('div');middle.className='app-calendar-title';middle.appendChild(heading);
 header.append(prevYear,back,middle,next,nextYear);popup.appendChild(header);
 for(const [button,offset] of [[prevYear,-12],[back,-1],[next,1],[nextYear,12]]){
   button.addEventListener('click',()=>{Object.assign(active,moveMonth(active.year,active.month,offset));drawCalendar();});
 }
 const weekdays=document.createElement('div');weekdays.className='app-calendar-weekdays';
 ['S','M','T','W','T','F','S'].forEach(d=>{const span=document.createElement('span');span.textContent=d;weekdays.appendChild(span);});
 popup.appendChild(weekdays);
 const days=document.createElement('div');days.className='app-calendar-grid';days.setAttribute('role','grid');days.setAttribute('aria-label',monthName(year,month));
 const count=new Date(year,month,0).getDate(),first=new Date(year,month-1,1).getDay();
 const today=todayParts(),tod=isoFor(today.year,today.month,today.day);
 const selected=input.value;
 for(let i=0;i<first;i++){const blank=document.createElement('span');blank.className='app-calendar-blank';days.appendChild(blank);}
 for(let day=1;day<=count;day++){
  const iso=isoFor(year,month,day);
  const button=document.createElement('button');button.type='button';button.className='app-calendar-day';
  button.textContent=String(day);button.dataset.date=iso;
  if(iso===tod)button.classList.add('today');
  if(iso===selected){button.classList.add('selected');button.setAttribute('aria-selected','true');}
  button.disabled=Boolean((input.min&&iso<input.min)||(input.max&&iso>input.max));
  button.setAttribute('aria-label',new Date(year,month-1,day).toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'}));
  button.addEventListener('click',()=>selectDate(iso));
  days.appendChild(button);
 }
 popup.appendChild(days);
 const footer=document.createElement('div');footer.className='app-calendar-footer';
 const todayButton=document.createElement('button');todayButton.type='button';todayButton.className='app-calendar-text-button';todayButton.textContent='Today';
 todayButton.disabled=Boolean((input.min&&tod<input.min)||(input.max&&tod>input.max));
 todayButton.addEventListener('click',()=>selectDate(tod));
 footer.appendChild(todayButton);
 if(!input.required){const clear=document.createElement('button');clear.type='button';clear.className='app-calendar-text-button';clear.textContent='Clear';clear.addEventListener('click',()=>selectDate(''));footer.appendChild(clear);}
 popup.appendChild(footer);
 placeCalendar(popup,trigger);
}
function selectDate(iso){
 if(!active)return;
 const {input}=active;
 input.value=iso;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 input.dispatchEvent(new Event('change',{bubbles:true}));
 closeCalendar(true);
}
function openCalendar(input,trigger){
 closeCalendar();
 const current=dateParts(input.value)||todayParts();
 const popup=document.createElement('div');
 popup.className='app-calendar';
 popup.setAttribute('role','dialog');
 popup.setAttribute('aria-label','Choose date');
 document.body.appendChild(popup);
 trigger.setAttribute('aria-expanded','true');trigger.classList.add('is-open');
 active={popup,input,trigger,year:current.year,month:current.month};
 drawCalendar();
 popup.addEventListener('keydown',e=>{
   const focused=e.target.closest('.app-calendar-day');
   if(!focused||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(e.key))return;
   e.preventDefault();
   const current=dateParts(focused.dataset.date);
   let next=new Date(current.year,current.month-1,current.day);
   if(e.key==='ArrowLeft')next.setDate(next.getDate()-1);
   if(e.key==='ArrowRight')next.setDate(next.getDate()+1);
   if(e.key==='ArrowUp')next.setDate(next.getDate()-7);
   if(e.key==='ArrowDown')next.setDate(next.getDate()+7);
   if(e.key==='Home')next.setDate(next.getDate()-next.getDay());
   if(e.key==='End')next.setDate(next.getDate()+6-next.getDay());
   if(e.key==='PageUp')next.setMonth(next.getMonth()-1);
   if(e.key==='PageDown')next.setMonth(next.getMonth()+1);
   if(next.getMonth()+1!==active.month||next.getFullYear()!==active.year){
     active.year=next.getFullYear();active.month=next.getMonth()+1;drawCalendar();
   }
   popup.querySelector('[data-date="'+isoFor(next.getFullYear(),next.getMonth()+1,next.getDate())+'"]')?.focus();
 });
 popup.querySelector('.app-calendar-day.selected, .app-calendar-day.today, .app-calendar-day:not(:disabled)')?.focus({preventScroll:true});
}
document.addEventListener('pointerdown',e=>{
 if(active&&!active.popup.contains(e.target)&&!active.trigger.contains(e.target))closeCalendar();
},true);
document.addEventListener('keydown',e=>{
 if(active&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeCalendar(true);}
},true);
window.addEventListener('resize',()=>closeCalendar());
document.addEventListener('scroll',e=>{
 if(active&&!active.popup.contains(e.target))closeCalendar();
},true);
export function enhanceDates(root=document){
 closeCalendar();
 root.querySelectorAll('input[type="date"]:not([data-app-date])').forEach(input=>{
  input.dataset.appDate='true';input.dataset.originalType='date';input.type='text';input.inputMode='none';input.tabIndex=-1;input.setAttribute('aria-hidden','true');
  const host=document.createElement('div');host.className='app-date-host';
  input.parentNode.insertBefore(host,input);host.appendChild(input);
  const trigger=document.createElement('button');trigger.type='button';trigger.className='app-date-trigger';
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  const label=input.closest('label')?.querySelector('span')?.textContent||'Date';
  trigger.setAttribute('aria-label',label.trim());
  const txt=document.createElement('span');txt.className='app-date-text';
  const symbol=document.createElement('span');symbol.className='app-date-icon';symbol.setAttribute('aria-hidden','true');symbol.textContent='▦';
  trigger.append(txt,symbol);host.append(trigger);
  const refresh=()=>{txt.textContent=format(input.value);trigger.disabled=input.disabled;trigger.classList.toggle('is-placeholder',!input.value);};
  trigger.addEventListener('click',()=>active?.trigger===trigger?closeCalendar():openCalendar(input,trigger));
  input.addEventListener('change',refresh);
  refresh();
 });
}
