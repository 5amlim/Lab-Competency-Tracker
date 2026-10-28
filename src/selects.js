// Accessible, website-rendered select menus. The underlying select remains the form's source of truth.
let opened = null;
function closeMenu(restoreFocus=false) {
  if (!opened) return;
  const {menu, trigger}=opened;
  menu.remove();
  trigger.setAttribute('aria-expanded','false');
  trigger.classList.remove('is-open');
  opened=null;
  if (restoreFocus && trigger.isConnected) trigger.focus();
}
function placeMenu(menu,trigger) {
  const rect=trigger.getBoundingClientRect();
  const width=Math.min(Math.max(rect.width,220),window.innerWidth-24);
  const left=Math.max(12,Math.min(rect.left,window.innerWidth-width-12));
  const roomBelow=window.innerHeight-rect.bottom;
  const maxHeight=Math.min(310,Math.max(148,window.innerHeight-36));
  const flip=roomBelow<190 && rect.top>roomBelow;
  Object.assign(menu.style,{position:'fixed',width:width+'px',left:left+'px',maxHeight:maxHeight+'px'});
  const h=Math.min(menu.scrollHeight,maxHeight);
  menu.style.top=(flip?Math.max(12,rect.top-h-7):Math.min(window.innerHeight-h-12,rect.bottom+7))+'px';
}
function showMenu(select,trigger) {
  closeMenu();
  const menu=document.createElement('div');
  menu.className='app-select-menu';
  menu.setAttribute('role','listbox');
  menu.setAttribute('aria-label',select.getAttribute('aria-label')||'Choose an option');
  const addOption=(option)=>{
    if(option.disabled)return;
    const item=document.createElement('button');
    item.type='button';
    item.className='app-select-option'+(option.selected?' selected':'');
    item.setAttribute('role','option');
    item.setAttribute('aria-selected',String(option.selected));
    item.textContent=option.textContent.trim();
    item.dataset.value=option.value;
    const mark=document.createElement('span');
    mark.className='app-select-check';
    mark.textContent='✓';
    mark.setAttribute('aria-hidden','true');
    item.appendChild(mark);
    item.addEventListener('click',()=>{
      closeMenu();
      select.value=option.value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      if(trigger.isConnected) refreshSelect(select);
    });
    menu.appendChild(item);
  };
  [...select.children].forEach(node=>{
    if(node.tagName==='OPTGROUP'){
      const group=document.createElement('div');
      group.className='app-select-group';
      group.textContent=node.label;
      menu.appendChild(group);
      [...node.children].forEach(addOption);
    }else if(node.tagName==='OPTION')addOption(node);
  });
  if (!menu.querySelector('.app-select-option')) return;
  document.body.appendChild(menu);
  trigger.classList.add('is-open');
  trigger.setAttribute('aria-expanded','true');
  opened={menu,trigger};
  placeMenu(menu,trigger);
  menu.addEventListener('keydown',e=>{
    const options=[...menu.querySelectorAll('.app-select-option')];
    const index=options.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      options[Math.max(0,Math.min(options.length-1,index+(e.key==='ArrowDown'?1:-1)))].focus();
    }
    if(e.key==='Escape'){e.preventDefault();closeMenu(true);}
  });
  const current=menu.querySelector('.selected')||menu.querySelector('.app-select-option');
  current?.scrollIntoView({block:'nearest'});
}
document.addEventListener('pointerdown',e=>{
  if(opened&&!opened.menu.contains(e.target)&&!opened.trigger.contains(e.target))closeMenu();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened){e.preventDefault();closeMenu(true);}});
window.addEventListener('resize',()=>closeMenu());
document.addEventListener('scroll',e=>{if(opened&&!opened.menu.contains(e.target))closeMenu();},true);

export function refreshSelect(select) {
  const host=select?.closest('.app-select-host');
  const button=host?.querySelector('.app-select-trigger');
  if(!button)return;
  button.querySelector('.app-select-text').textContent=select.selectedOptions[0]?.textContent.trim()||'Choose an option';
  button.disabled=select.disabled;
  button.classList.toggle('is-placeholder',!select.value);
}
export function enhanceSelects(root=document) {
  closeMenu();
  root.querySelectorAll('select:not([data-app-select])').forEach(select=>{
    select.dataset.appSelect='true';
    const host=document.createElement('div');
    host.className='app-select-host';
    select.parentNode.insertBefore(host,select);
    host.appendChild(select);
    const button=document.createElement('button');
    button.type='button';
    button.className='app-select-trigger';
    button.setAttribute('aria-haspopup','listbox');
    button.setAttribute('aria-expanded','false');
    const fieldLabel=select.closest('label')?.querySelector('span')?.textContent||select.getAttribute('aria-label')||'Select';
    button.setAttribute('aria-label',fieldLabel.trim());
    const text=document.createElement('span');
    text.className='app-select-text';
    const chevron=document.createElement('span');
    chevron.className='app-select-chevron';
    chevron.setAttribute('aria-hidden','true');
    button.append(text,chevron);
    host.appendChild(button);
    button.addEventListener('click',()=>opened?.trigger===button?closeMenu():showMenu(select,button));
    button.addEventListener('keydown',e=>{
      if(['ArrowDown','Enter',' '].includes(e.key)){e.preventDefault();showMenu(select,button);}
    });
    select.addEventListener('change',()=>refreshSelect(select));
    refreshSelect(select);
  });
}
export function dismissSelectMenus(){closeMenu();}
