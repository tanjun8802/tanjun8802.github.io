'use strict';

// This tool is excluded from the public build. All edits are held locally until Save.
const form = document.querySelector('#editor-form');
const status = document.querySelector('#editor-status');
const saveButton = document.querySelector('#save-content');
const downloadButton = document.querySelector('#download-content');
const sections = {
  profile: ['Profile', 'Your introduction, contact links and the story behind your work.'],
  projects: ['Projects', 'The first six projects are featured. Expand a project to edit its story, pictures and captions.'],
  journey: ['Education & work', 'Keep milestones in newest-first order. These entries also supply your public CV.'],
  highlights: ['Photo gallery', 'These photographs appear in the introduction. Every picture should have a helpful caption.'],
  interests: ['Interests', 'The pursuits and achievements that form part of your story.'],
  sources: ['Sources', 'Reference documents and links supporting your portfolio.'],
  editorial_notes: ['Editorial notes', 'Notes for maintaining accurate content. These are not displayed on the website.']
};
const labels = {id:'Permanent link ID', cv:'Public CV link', portfolio:'Engineering portfolio link', repo:'Repository link', source:'Source document or link', source_label:'Source label', image_description:'Picture description', organization:'Organisation', fit:'Picture fit', diagram:'Illustration style', project:'Related project ID', highlights:'Highlights', sections:'Story sections', gallery:'Additional photographs', image:'Picture', text:'Story text', url:'Link', path:'File path', stat:'Achievement', detail:'Supporting detail'};
const choices = {category:['ai','robotics','engineering'], branch:['education','work','life'], fit:['contain','cover'], diagram:['gik','qleac','mase','transfer','golf']};
const pendingImages = new Map();
const objectURLs = new Set();
let data;
let baseline;
let selectedSection = 'profile';
let dirty = false;
let directory;
let fieldCounter = 0;
let saving = false;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function labelFor(key) { return labels[key] || key.replaceAll('_',' ').replace(/\b\w/g, letter => letter.toUpperCase()); }
function report(message, tone='') { status.textContent = message; status.dataset.tone = tone; }
function changed() { dirty = true; report('Unsaved changes' + (pendingImages.size ? ` · ${pendingImages.size} new picture(s)` : '')); }
function canonical(value) { return JSON.stringify(value); }
function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The content file must contain a JSON object.');
  if (!value.profile || typeof value.profile.name !== 'string' || !value.profile.name.trim()) throw new Error('Profile needs a name.');
  for (const key of ['projects','journey','highlights']) {
    if (!Array.isArray(value[key]) || !value[key].length) throw new Error(`${labelFor(key)} must contain at least one item.`);
    if (value[key].some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw new Error(`${labelFor(key)} must contain objects.`);
  }
  const textFields = new Set(['name','email','github','linkedin','cv','portfolio','specialism','introduction','story','title','id','category','context','year','summary','result','source','source_label','branch','date','label','organization','role','image','caption','description','text','stat','detail','repo','diagram','image_description','fit','project','heading','url','path']);
  function checkFields(item, path='content') {
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      if (textFields.has(key) && typeof child !== 'string') throw new Error(`${path}.${key}: enter text, not a number, object or list.`);
      checkFields(child, `${path}.${key}`);
    }
  }
  checkFields(value);
  for (const key of ['projects','journey']) {
    const ids = new Set();
    for (const item of value[key]) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id || '')) throw new Error(`${labelFor(key)}: use a lowercase permanent ID, such as autonomous-rover.`);
      if (ids.has(item.id)) throw new Error(`${labelFor(key)}: duplicate ID “${item.id}”. Give every entry a unique ID.`);
      ids.add(item.id);
    }
  }
}
function renderNavigation() {
  const nav = document.querySelector('#sections');
  nav.replaceChildren();
  for (const key of Object.keys(data)) {
    const button = el('button','section-button',sections[key]?.[0] || labelFor(key));
    button.type = 'button';
    if (key === selectedSection) button.setAttribute('aria-current','page');
    button.addEventListener('click',() => { selectedSection = key; render(); document.querySelector('#section-title').focus(); });
    nav.append(button);
  }
}
function render() {
  renderNavigation();
  const value = data[selectedSection];
  document.querySelector('#section-title').textContent = sections[selectedSection]?.[0] || labelFor(selectedSection);
  document.querySelector('#section-help').textContent = sections[selectedSection]?.[1] || 'Edit the fields below, then save and preview your changes.';
  document.querySelector('#section-count').textContent = Array.isArray(value) ? `${value.length} ENTRIES` : 'CONTENT';
  form.replaceChildren(renderValue(data, selectedSection, [selectedSection]));
}
function renderValue(parent, key, path) {
  const value = parent[key];
  if (Array.isArray(value)) return renderArray(value,key,path);
  if (value && typeof value === 'object') {
    const group = el('div','object-fields');
    for (const child of Object.keys(value)) group.append(renderValue(value,child,[...path,child]));
    return group;
  }
  return renderField(parent,key,path);
}
function blankLike(value, key='') {
  if (key === 'id') return `new-entry-${Date.now().toString(36)}`;
  if (choices[key]) return value || choices[key][0];
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([name,item]) => [name,blankLike(item,name)]));
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return 0;
  return '';
}
function arrayTemplate(key, items) {
  if (items.length) return blankLike(items[0]);
  if (key === 'sections') return {heading:'',text:''};
  if (key === 'gallery') return {image:'',caption:'',description:''};
  return '';
}
function renderArray(items,key,path) {
  const group = el('div','array-group');
  if (path.length > 1) group.append(el('h3','array-title',labelFor(key)));
  const list = el('div','array-list');
  function draw(focusIndex) {
    list.replaceChildren();
    items.forEach((item,index) => {
      const isObject = item && typeof item === 'object' && !Array.isArray(item);
      const record = el(isObject ? 'details' : 'div',isObject ? 'record' : 'array-item');
      let body = record;
      if (isObject) {
        const summary = el('summary');
        summary.append(el('span','record-number',String(index+1).padStart(2,'0')),document.createTextNode(item.title || item.organization || item.label || item.heading || item.caption || item.id || `Entry ${index+1}`));
        record.append(summary);
        body = el('div','record-body'); record.append(body);
        if (focusIndex === index) record.open = true;
      }
      body.append(renderValue(items,index,[...path,index]));
      const tools = el('div','record-tools');
      if (key === 'projects' && isObject && !Object.hasOwn(item,'image')) {
        const addPicture = el('button','small-button','Add a picture'); addPicture.type='button';
        addPicture.addEventListener('click',() => {
          item.image=''; item.image_description=item.image_description || ''; item.gallery=item.gallery || [];
          changed(); draw(index); list.children[index].querySelector('input[type="file"]')?.focus();
        });
        tools.append(addPicture);
      }
      if (key === 'projects' && isObject && !Object.hasOwn(item,'gallery')) {
        const addGallery = el('button','small-button','Add a photo gallery'); addGallery.type='button';
        addGallery.addEventListener('click',() => { item.gallery=[]; changed(); draw(index); list.children[index].querySelector('summary')?.focus(); });
        tools.append(addGallery);
      }
      for (const [text,direction] of [['Move up',-1],['Move down',1]]) {
        const move = el('button','small-button',text); move.type='button';
        move.disabled = index+direction < 0 || index+direction >= items.length;
        move.setAttribute('aria-label',`${text}: entry ${index+1}`);
        move.addEventListener('click',() => {
          [items[index],items[index+direction]] = [items[index+direction],items[index]];
          changed(); draw(index+direction);
          list.children[index+direction].querySelector('summary,input,textarea,button')?.focus();
        });
        tools.append(move);
      }
      const remove = el('button','small-button danger','Remove'); remove.type='button';
      remove.setAttribute('aria-label',`Remove entry ${index+1}`);
      remove.addEventListener('click',() => {
        if (!window.confirm('Remove this entry? This will take effect when you save your changes.')) return;
        items.splice(index,1); changed(); draw(); add.focus(); updateCount();
      });
      tools.append(remove); body.append(tools); list.append(record);
    });
  }
  function updateCount() {
    if (path.length === 1) document.querySelector('#section-count').textContent = `${items.length} ENTRIES`;
  }
  const add = el('button','add-button',`+ Add ${key === 'tags' ? 'tag' : key === 'gallery' ? 'picture' : 'entry'}`); add.type='button';
  add.addEventListener('click',() => { items.push(arrayTemplate(key,items)); changed(); draw(items.length-1); updateCount(); list.lastElementChild?.querySelector('input,textarea,summary')?.focus(); });
  group.append(list,add); draw(); return group;
}
function safeImagePath(value) { return typeof value === 'string' && /^assets\/images\/[a-zA-Z0-9_ .%-]+\.(jpe?g|png|webp|avif)$/i.test(value); }
function renderField(parent,key,path) {
  const value = parent[key];
  const name = typeof key === 'number' ? `Item ${key+1}` : labelFor(key);
  const wrapper = el('div','field');
  const label = el('label','field-label',name);
  const id = `field-${++fieldCounter}`; label.htmlFor=id;
  let input;
  if (choices[key] || key === 'project') {
    input = el('select');
    const options = key === 'project' ? ['',...data.projects.map(project => project.id)] : choices[key];
    for (const choice of new Set([value,...options])) {
      const option = el('option','',choice || 'None'); option.value=choice || ''; input.append(option);
    }
    input.value=value || '';
  } else if (typeof value === 'boolean') { input=el('input'); input.type='checkbox'; input.checked=value; }
  else if (typeof value === 'string' && (value.length > 100 || /^(summary|text|description|introduction|story|result|image_description)$/.test(key))) { input=el('textarea',value.length>250?'long-text':''); input.value=value; }
  else { input=el('input'); input.type=typeof value === 'number'?'number':'text'; input.value=value ?? ''; }
  input.id=id;
  input.addEventListener('input',() => {
    if (['project','repo'].includes(key) && !input.value.trim()) delete parent[key];
    else parent[key]=input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) : input.value;
    changed();
  });
  wrapper.append(label,input);
  if (key === 'id') wrapper.append(el('p','field-help','Keep existing IDs unchanged so shared project links continue to work. Use lowercase letters, numbers and hyphens for new IDs.'));
  if (key === 'diagram') wrapper.append(el('p','field-help','Used when this project has no photograph. Use Add a picture below to replace the illustration with a photograph.'));
  if (key === 'image') addImagePicker(wrapper,input,parent,key);
  return wrapper;
}
function addImagePicker(wrapper,input,parent,key) {
  const preview = el('img','image-preview'); preview.alt='Selected picture preview';
  function updatePreview() {
    const pending = pendingImages.get(input.value);
    preview.hidden=!pending && !safeImagePath(input.value);
    if (pending) preview.src=pending.url;
    else if (!preview.hidden) preview.src=input.value;
  }
  preview.addEventListener('error',() => { preview.hidden=true; });
  input.addEventListener('input',updatePreview);
  const controls = el('div','image-controls');
  const label = el('label','button secondary file-button','Choose a new picture');
  const picker = el('input'); picker.type='file'; picker.accept='image/jpeg,image/png,image/webp,image/avif';
  picker.setAttribute('aria-label','Choose a new picture');
  picker.addEventListener('change',() => {
    const file = picker.files[0]; if (!file) return;
    const extensions = {'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'};
    if (!extensions[file.type] || file.size>8*1024*1024) { report('Choose a JPEG, PNG, WebP or AVIF image under 8 MB.','error'); picker.value=''; return; }
    const stem = file.name.replace(/\.[^.]+$/,'').toLowerCase().replace(/[^a-z0-9-]+/g,'-').replace(/^-|-$/g,'').slice(0,60) || 'picture';
    const filename = `${stem}-${crypto.randomUUID().slice(0,8)}.${extensions[file.type]}`;
    const path = `assets/images/${filename}`;
    const url=URL.createObjectURL(file); objectURLs.add(url);
    pendingImages.set(path,{file,url,filename});
    parent[key]=path; input.value=path; updatePreview(); changed();
  });
  label.append(picker); controls.append(label,el('span','field-help','Up to 8 MB. Add a description so visitors understand the picture.'));
  wrapper.append(preview,controls); updatePreview();
}
function loaded(value,initial=false) {
  validate(value); data=value;
  if (initial) baseline=canonical(value);
  if (!(selectedSection in data)) selectedSection='profile';
  dirty=!initial;
  saveButton.disabled=false; downloadButton.disabled=false;
  document.querySelector('#load-help').hidden=true;
  render(); report(initial ? 'Ready to edit · no unsaved changes' : 'Imported content · review before saving');
}
function referencedImages() { const serialized=JSON.stringify(data); return [...pendingImages].filter(([path])=>serialized.includes(path)); }
function revokeDownloads() { document.querySelectorAll('#download-list a').forEach(link => URL.revokeObjectURL(link.href)); }
function downloadChanges() {
  try { validate(data); } catch(error) { report(error.message,'error'); return; }
  revokeDownloads();
  const list=document.querySelector('#download-list'); list.replaceChildren();
  const blob=new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'});
  const contentLink=el('a','button secondary','Download data.json'); contentLink.download='data.json'; contentLink.href=URL.createObjectURL(blob); list.append(contentLink);
  for (const [,item] of referencedImages()) { const link=el('a','button secondary',`Download ${item.filename}`); link.download=item.filename; link.href=URL.createObjectURL(item.file); list.append(link); }
  document.querySelector('#download-dialog').showModal();
}
downloadButton.addEventListener('click',downloadChanges);
document.querySelector('#close-download').addEventListener('click',()=>document.querySelector('#download-dialog').close());
saveButton.addEventListener('click',async () => {
  try {
    validate(data);
    if (!window.showDirectoryPicker) { downloadChanges(); return; }
    directory=await window.showDirectoryPicker({id:'portfolio-project',mode:'readwrite'});
    await (await directory.getDirectoryHandle('templates')).getFileHandle('index.html');
    const existing=await (await directory.getFileHandle('data.json')).getFile();
    const existingData=JSON.parse(await existing.text()); validate(existingData);
    if (baseline && canonical(existingData)!==baseline) throw new Error('data.json has changed outside this editor. Download your changes as a backup, reload the editor, and merge your edits before saving.');
    document.querySelector('#save-description').textContent=`Save data.json and ${referencedImages().length} new picture(s) to “${directory.name}”?`;
    document.querySelector('#save-dialog').showModal();
  } catch(error) {
    if (error.name==='AbortError') return;
    report(error.name==='NotFoundError' ? 'Choose the project folder containing templates/index.html and data.json.' : error.message,'error');
  }
});
document.querySelector('#cancel-save').addEventListener('click',()=>document.querySelector('#save-dialog').close());
document.querySelector('#confirm-save').addEventListener('click',async () => {
  if (saving) return;
  saving=true;
  const button=document.querySelector('#confirm-save'); button.disabled=true;
  try {
    validate(data);
    const current=JSON.parse(await (await (await directory.getFileHandle('data.json')).getFile()).text());
    if (baseline && canonical(current)!==baseline) throw new Error('data.json changed after you selected the folder. Save a download backup and reload before trying again.');
    const images=referencedImages();
    if (images.length) {
      const assets=await directory.getDirectoryHandle('assets',{create:true});
      const folder=await assets.getDirectoryHandle('images',{create:true});
      for (const [,item] of images) {
        const writable=await (await folder.getFileHandle(item.filename,{create:true})).createWritable();
        await writable.write(item.file); await writable.close();
      }
    }
    const writable=await (await directory.getFileHandle('data.json')).createWritable();
    await writable.write(JSON.stringify(data,null,2)+'\n'); await writable.close();
    baseline=canonical(data); dirty=false;
    pendingImages.clear();
    document.querySelector('#save-dialog').close();
    report('Saved locally. Run python3 scripts/site.py build, then refresh the built website preview.');
  } catch(error) { report(`Save failed: ${error.message} Your edits remain in this browser; you can download a backup.`,'error'); document.querySelector('#save-dialog').close(); }
  finally { saving=false; button.disabled=false; }
});
document.querySelector('#import-content').addEventListener('change',async event => {
  const file=event.target.files[0]; if (!file) return;
  if (dirty && !window.confirm('Replace the current unsaved text with this file? Download a backup first if you need to keep it.')) { event.target.value=''; return; }
  try { loaded(JSON.parse(await file.text())); }
  catch(error) { report(`Import failed: ${error.message}`,'error'); }
  event.target.value='';
});
form.addEventListener('submit',event=>event.preventDefault());
window.addEventListener('beforeunload',event=> { if (dirty || saving) { event.preventDefault(); event.returnValue=''; } });
window.addEventListener('pagehide',()=> { for (const url of objectURLs) URL.revokeObjectURL(url); });
fetch('data.json',{cache:'no-store'}).then(response=> { if (!response.ok) throw new Error('data.json could not be loaded.'); return response.json(); }).then(value=>loaded(value,true)).catch(error=> { report(error.message,'error'); document.querySelector('#section-title').textContent='Open your content file'; document.querySelector('#load-help').hidden=false; });
