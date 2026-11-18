'use strict';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const colors = {education:'#72dec0', work:'#ffad92', life:'#bfa4ff'};
const categories = {ai:'AI & MACHINE LEARNING', robotics:'ROBOTICS', engineering:'ENGINEERING'};
let content;
let journeyFilter = 'all';
let selectedCommit;
let projectFilter = 'all';
let showArchive = false;
let lastStoryTrigger;
let currentStoryId;
const projectSearch = $('#project-search');
const menuToggle = $('.menu-toggle');
const navLinks = $('#nav-links');
const dialog = $('#story-dialog');

$('#year').textContent = new Date().getFullYear();
function setMenu(open) {
  menuToggle.setAttribute('aria-expanded', String(open));
  navLinks.classList.toggle('is-open', open);
}
menuToggle.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
$$('a', navLinks).forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.nav')) setMenu(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
    setMenu(false);
    menuToggle.focus();
  }
});
matchMedia('(min-width: 901px)').addEventListener('change', () => setMenu(false));

function visibleCommits() {
  return content.journey.filter(commit => journeyFilter === 'all' || commit.branch === journeyFilter);
}

function drawGraph() {
  const list = $('#commit-list');
  const rows = $$('.commit-row', list);
  if (!rows.length) return;
  const commits = visibleCommits();
  const width = parseFloat(getComputedStyle(list).getPropertyValue('--graph-width'));
  const rect = list.getBoundingClientRect();
  // Measure the real node centres: wrapping text must never detach an edge.
  const points = rows.map(row => {
    const marker = $('.commit-marker i', row).getBoundingClientRect();
    return {x: marker.left + marker.width / 2 - rect.left, y: marker.top + marker.height / 2 - rect.top};
  });
  const edges = [];
  const connect = (older, newer, branch) => {
    if (older === undefined || newer === undefined || older === newer) return;
    const from = points[older];
    const to = points[newer];
    const bend = Math.min(40, Math.abs(from.y - to.y) / 2);
    const path = from.x === to.x
      ? `M${from.x} ${from.y}V${to.y}`
      : `M${from.x} ${from.y}C${from.x} ${from.y-bend} ${to.x} ${to.y+bend} ${to.x} ${to.y}`;
    edges.push(`<path d="${path}" stroke="${colors[branch]}"/>`);
  };
  const branches = Object.keys(colors);
  branches.forEach(branch => {
    const indices = commits.flatMap((commit, index) => commit.branch === branch ? [index] : []);
    // Each branch connects only its own actual milestones.
    for (let index = 1; index < indices.length; index++) connect(indices[index], indices[index-1], branch);
    if (journeyFilter !== 'all' || branch === 'education' || !indices.length) return;
    const oldest = indices.at(-1);
    const newest = indices[0];
    const olderEducation = commits.findIndex((commit, index) => index > oldest && commit.branch === 'education');
    const newerEducation = commits.findLastIndex((commit, index) => index < newest && commit.branch === 'education');
    // Work and personal chapters fork from, and rejoin, neighbouring study nodes.
    // An unbounded branch simply ends at its final milestone, without invented nodes.
    if (olderEducation >= 0) connect(olderEducation, oldest, branch);
    if (newerEducation >= 0) connect(newest, newerEducation, branch);
  });
  const paths = edges.join('');
  let svg = $('.branch-svg', list);
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.classList.add('branch-svg');
    svg.setAttribute('aria-hidden','true');
    list.prepend(svg);
  }
  svg.setAttribute('viewBox',`0 0 ${width} ${rect.height}`);
  svg.style.height = `${rect.height}px`;
  svg.innerHTML = paths;
}

function renderGraph() {
  const commits = visibleCommits();
  const positions = {education:39,work:65,life:14};
  $('#commit-list').innerHTML = commits.map(commit => `
    <button class="commit-row ${commit.id === selectedCommit ? 'selected' : ''}" data-commit="${escapeHTML(commit.id)}" aria-pressed="${commit.id === selectedCommit}" aria-controls="commit-inspector" style="--branch-color:${colors[commit.branch]};--node-x:${positions[commit.branch]}px">
      <span class="commit-marker" aria-hidden="true"><i></i></span><span class="commit-text"><span class="commit-branch">${escapeHTML(commit.branch)}${commit.id === content.journey[0]?.id ? '<span class="head-label">LATEST</span>' : ''}</span><strong>${escapeHTML(commit.label)}</strong><span>${escapeHTML(commit.organization)}</span></span><span class="commit-year">${escapeHTML(commit.year)}</span>
    </button>`).join('');
  $$('.commit-row').forEach(button => {
    button.addEventListener('click', () => {
      selectCommit(button.dataset.commit);
      if (matchMedia('(max-width: 900px)').matches) {
        $('#commit-inspector').focus({preventScroll:true});
        $('#commit-inspector').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'start'});
      }
    });
    button.addEventListener('keydown', event => {
      if (!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const rows = $$('.commit-row');
      let index = rows.indexOf(button);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = rows.length - 1;
      else index = (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length;
      selectCommit(rows[index].dataset.commit);
      rows[index].focus({preventScroll:true});
    });
  });
  $('#commit-count').textContent = `${commits.length} ${commits.length === 1 ? 'milestone' : 'milestones'}`;
  drawGraph();
}

function selectCommit(id) {
  selectedCommit = id;
  $$('.commit-row').forEach(button => {
    const active = button.dataset.commit === id;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderInspector();
}

function renderInspector() {
  const commit = content.journey.find(item => item.id === selectedCommit);
  const commits = visibleCommits();
  if (!commit) {
    $('#commit-inspector').innerHTML = '<p class="inspector-description">No milestones in this branch yet. Select another branch.</p>';
    return;
  }
  const index = commits.findIndex(item => item.id === selectedCommit);
  $('#commit-inspector').style.setProperty('--selected-branch', colors[commit.branch]);
  $('#commit-inspector').innerHTML = `
    <div class="inspector-meta"><span class="branch-badge ${escapeHTML(commit.branch)}"><i class="legend-dot ${escapeHTML(commit.branch)}"></i>${escapeHTML(commit.branch)}</span><span>MILESTONE ${String(content.journey.length-content.journey.indexOf(commit)).padStart(2,'0')}</span></div>
    <h3>${escapeHTML(commit.organization)}</h3><p class="inspector-role">${escapeHTML(commit.role)}</p><p class="inspector-date">${escapeHTML(commit.date)}</p>
    <hr class="inspector-divider"><p class="inspector-description">${escapeHTML(commit.summary)}</p>
    <ul class="inspector-highlights">${commit.highlights.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul>
    <div class="tag-list">${commit.tags.map(tag=>`<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
    ${commit.project ? `<button class="text-link" style="margin-top:18px;background:transparent" data-related-project="${escapeHTML(commit.project)}">View project details ↗</button><br>` : ''}
    <a class="inspector-source" href="${escapeHTML(commit.source)}" target="_blank" rel="noopener">${escapeHTML(commit.source_label)} ↗</a>
    <div class="inspector-nav"><button aria-label="Newer milestone" data-direction="-1" ${index === 0 ? 'disabled' : ''}>↑</button><button aria-label="Earlier milestone" data-direction="1" ${index === commits.length-1 ? 'disabled' : ''}>↓</button></div>`;
  $$('[data-direction]').forEach(button => button.addEventListener('click', () => {
    const direction = button.dataset.direction;
    selectCommit(commits[index + Number(direction)].id);
    const replacement = $(`[data-direction="${direction}"]`);
    (replacement.disabled ? $('.inspector-nav button:not(:disabled)') : replacement)?.focus({preventScroll:true});
  }));
  const related = $('[data-related-project]');
  if (related) related.addEventListener('click', () => openStory(related.dataset.relatedProject, related));
}

$$('[data-journey-filter]').forEach(button => button.addEventListener('click', () => {
  if (!content) return;
  journeyFilter = button.dataset.journeyFilter;
  $$('[data-journey-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  if (!visibleCommits().some(commit => commit.id === selectedCommit)) selectedCommit = visibleCommits()[0]?.id;
  renderGraph();
  renderInspector();
}));

const diagrams = {
  transfer:{title:'TASK-BASED TRANSFER / REINFORCEMENT LEARNING',nodes:[['Explore','contrastive RL'],['Factorise','F-N-B'],['Transfer','new tasks']],caption:'CONTRASTIVE REPRESENTATIONS · TASK TRANSFER'},
  gik:{title:'GLOVE-BASED INVISIBLE KEYBOARD', nodes:[['118D','sensor input'],['LSTM','attention'],['ABC','LM fusion']], caption:'MOVEMENT → REPRESENTATION → CHARACTERS'},
  qleac:{title:'Q-LEAC / THE FEEDBACK LOOP',nodes:[['Q-learning','controller'],['Stimulate','forearm'],['Track','UltraLeap']],caption:'SENSE → LEARN → ACT → SENSE AGAIN'},
  mase:{title:'MASE EDGE / HARDWARE IN THE LOOP',nodes:[['Search','Optuna'],['Deploy','Android'],['Measure','feedback']],caption:'MODEL × DEVICE × OPTIMISATION'},
  golf:{title:'EXPERIMENTS IN MODEL EFFICIENCY',nodes:[['Train','Muon'],['Quantise','MXINT4'],['Prune','weights']],caption:'TRAINING · QUANTISATION · PRUNING'}
};

function diagramHTML(type, extraClass='') {
  const diagram = diagrams[type];
  const marks = {gik:['A ↗','Wearable input'],qleac:['↻','Learning through feedback'],mase:['↗','Model meets device'],transfer:['◇ → ◇','Transfer across tasks'],golf:['{ · }','Efficient language models']};
  const mark = marks[type];
  return `<div class="diagram diagram-${escapeHTML(type)} ${extraClass}" role="img" aria-label="${escapeHTML(diagram.title + ': ' + diagram.nodes.map(node=>node.join(' — ')).join('; '))}"><span class="diagram-title">${escapeHTML(diagram.title)}</span><div class="diagram-mark" aria-hidden="true"><strong>${mark[0]}</strong><span>${mark[1]}</span></div><div class="diagram-flow">${diagram.nodes.map((node,index)=>`${index ? '<span class="diagram-arrow" aria-hidden="true">→</span>':''}<div class="diagram-node">${escapeHTML(node[0])}<small>${escapeHTML(node[1])}</small></div>`).join('')}</div><span class="diagram-caption">${escapeHTML(diagram.caption)}</span></div>`;
}

/** Manual image navigation keeps each caption visible until the reader advances. */
function createCarousel(slides, {label, className=''}) {
  const figure = document.createElement('figure');
  figure.className = `carousel ${className}`;
  figure.setAttribute('role','region');
  figure.setAttribute('aria-roledescription','carousel');
  figure.setAttribute('aria-label',label);
  figure.innerHTML = `<div class="carousel-media" role="group" aria-roledescription="slide"></div><figcaption class="carousel-caption" aria-live="polite" aria-atomic="true"></figcaption>`;
  let index = 0;
  const media = $('.carousel-media',figure);
  const caption = $('.carousel-caption',figure);
  let counter;
  let dots = [];
  if (slides.length > 1) {
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.innerHTML = `<div class="carousel-arrows"><button class="carousel-arrow carousel-prev" aria-label="Previous image">←</button><span class="carousel-counter" aria-hidden="true"></span><button class="carousel-arrow carousel-next" aria-label="Next image">→</button></div><div class="carousel-dots" role="group" aria-label="Choose an image">${slides.map((slide,i)=>`<button class="carousel-dot" data-slide="${i}" aria-label="Show image ${i+1}: ${escapeHTML(slide.title)}" aria-pressed="false"></button>`).join('')}</div>`;
    caption.before(controls);
    counter = $('.carousel-counter',figure);
    dots = $$('.carousel-dot',figure);
    $('.carousel-prev',figure).addEventListener('click',()=>show(index-1));
    $('.carousel-next',figure).addEventListener('click',()=>show(index+1));
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>show(i)));
    let swipeStart;
    media.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && event.isPrimary) swipeStart = [event.clientX, event.clientY];
    });
    media.addEventListener('pointercancel', () => { swipeStart = undefined; });
    media.addEventListener('pointerup', event => {
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart[0];
      const dy = event.clientY - swipeStart[1];
      swipeStart = undefined;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    });
    figure.addEventListener('keydown',event=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      // Native text selection and input editing should retain their own key behaviour.
      if (event.target.matches('input,textarea') || caption.contains(event.target)) return;
      event.preventDefault();
      if (event.key==='Home') show(0);
      else if (event.key==='End') show(slides.length-1);
      else show(index+(event.key==='ArrowRight'?1:-1));
    });
  }
  function show(nextIndex) {
    index = (nextIndex+slides.length)%slides.length;
    const slide = slides[index];
    figure.dataset.slideIndex = String(index);
    media.setAttribute('aria-label',`Image ${index+1} of ${slides.length}`);
    media.classList.toggle('is-diagram', !slide.image);
    if (slide.image) {
      const img = document.createElement('img');
      img.src = slide.image;
      img.alt = slide.title;
      img.width = 1000; img.height = 735;
      if (slide.fit==='cover') img.classList.add('cover');
      if (index===0 && className==='highlights-carousel') img.fetchPriority='high';
      media.replaceChildren(img);
    } else media.innerHTML = diagramHTML(slide.diagram);
    caption.innerHTML = `${slide.context?`<p class="eyebrow">${escapeHTML(slide.context)}</p>`:''}<h3>${escapeHTML(slide.title)}</h3><p>${escapeHTML(slide.description)}</p>${slide.project?`<button class="text-link carousel-project-link" data-slide-project="${escapeHTML(slide.project)}">View project details ↗</button>`:''}`;
    const projectButton = $('[data-slide-project]',caption);
    if (projectButton) projectButton.addEventListener('click',()=>openStory(projectButton.dataset.slideProject,projectButton));
    if (counter) counter.textContent = `${index+1} / ${slides.length}`;
    dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));
  }
  show(0);
  return figure;
}

function renderProjects() {
  const query = projectSearch.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const categoryProjects = content.projects.filter(project => projectFilter === 'all' || project.category === projectFilter);
  const all = categoryProjects.filter(project => {
    const searchable = [project.title, project.summary, project.context, project.image_description, project.result, ...project.tags, ...project.sections.map(section => section.text)].join(' ').toLowerCase();
    return terms.every(term => searchable.includes(term));
  });
  const visible = query || showArchive || projectFilter !== 'all' ? all : all.slice(0,6);
  $('#project-grid').innerHTML = visible.map(project => `
    <details class="project-card" data-id="${escapeHTML(project.id)}">
      <summary class="project-summary">
        <span class="project-visual" aria-hidden="true">${project.image ? `<img src="${escapeHTML(project.image)}" alt="" loading="lazy" width="600" height="400">` : diagramHTML(project.diagram)}<span class="project-index">${String(content.projects.indexOf(project)+1).padStart(2,'0')}</span></span>
        <span class="project-label">
          <span class="project-meta">${categories[project.category]} <span class="project-date">${escapeHTML(project.year)}</span></span>
          <span class="project-title-line"><span class="project-title">${escapeHTML(project.title)}</span><span class="project-expand" aria-hidden="true"></span></span>
          <span class="project-preview">${escapeHTML(project.preview || project.summary)}</span>
        </span>
      </summary>
      <div class="project-overview">
        <p class="project-context">${escapeHTML(project.context)} · ${escapeHTML(project.year)}</p>
        <p class="project-description">${escapeHTML(project.summary)}</p>
        <div class="tag-list">${project.tags.map(tag=>`<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
        <button class="project-case-study" aria-haspopup="dialog" aria-label="View project: ${escapeHTML(project.title)}">View project details <span aria-hidden="true">↗</span></button>
      </div>
    </details>`).join('');
  if (!visible.length) {
    $('#project-grid').innerHTML = '<div class="project-empty"><h3>No matching projects</h3><p>Try a different term or clear the filters.</p><button class="button button-outline" id="clear-project-filters">Clear filters</button></div>';
    $('#clear-project-filters').addEventListener('click', () => {
      projectSearch.value = '';
      $('[data-project-filter="all"]').click();
      projectSearch.focus();
    });
  }
  const cards = $$('.project-card');
  cards.forEach(card => {
    const summary = $('.project-summary',card);
    const overview = $('.project-overview',card);
    const caseStudy = $('.project-case-study',card);
    let openedByHover = false;
    let pointerInside = false;
    let hoverDismissed = false;
    function closeHoverPreview() {
      if (openedByHover && !pointerInside && !overview.contains(document.activeElement) && !dialog.open) {
        card.open = false;
        openedByHover = false;
      }
    }
    card.addEventListener('pointermove',event => {
      if (event.pointerType !== 'mouse' || !matchMedia('(hover: hover) and (pointer: fine) and (min-width: 601px)').matches) return;
      pointerInside = true;
      if (!card.open && !hoverDismissed) {
        openedByHover = true;
        card.open = true;
        card.classList.add('hover-preview');
      }
    });
    card.addEventListener('pointerleave',event => {
      if (event.pointerType !== 'mouse') return;
      pointerInside = false;
      hoverDismissed = false;
      closeHoverPreview();
    });
    card.addEventListener('focusout',event => {
      if (!card.contains(event.relatedTarget)) queueMicrotask(closeHoverPreview);
    });
    card.addEventListener('keydown',event => {
      if (event.key === 'Escape' && card.open && !dialog.open) {
        event.stopPropagation();
        card.open = false;
        openedByHover = false;
        summary.focus({preventScroll:true});
      }
    });
    summary.addEventListener('click', event => {
      if (openedByHover && card.open) {
        // The first click on an already-hovered tile keeps the overview open.
        event.preventDefault();
      }
      openedByHover = false;
      card.classList.remove('hover-preview');
    });
    card.addEventListener('toggle', () => {
      if (!card.open) {
        card.classList.remove('hover-preview');
        hoverDismissed = pointerInside;
      }
    });
    caseStudy.addEventListener('click',() => openStory(card.dataset.id,caseStudy));
  });
  $('#project-count').textContent = visible.length === all.length ? `${all.length} ${all.length === 1 ? 'project' : 'projects'}` : `${visible.length} of ${all.length} projects`;
  $('#show-projects').hidden = Boolean(query) || projectFilter !== 'all';
  $('#show-projects').innerHTML = showArchive ? 'Back to selected work <span aria-hidden="true">↑</span>' : `Explore all ${content.projects.length} projects <span aria-hidden="true">↓</span>`;
}

// Allow dismissal of a hover preview even when the pointer did not move focus.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !dialog.open) {
    $$('.project-card[open]:hover').forEach(card => { card.open = false; });
  }
});

projectSearch.addEventListener('input', () => { if (content) renderProjects(); });
$$('[data-project-filter]').forEach(button => button.addEventListener('click', () => {
  if (!content) return;
  projectFilter = button.dataset.projectFilter;
  $$('[data-project-filter]').forEach(item => {
    const active = item === button;
    item.classList.toggle('active',active);
    item.setAttribute('aria-pressed',String(active));
  });
  renderProjects();
}));
$('#show-projects').addEventListener('click', () => {
  if (!content) return;
  showArchive = !showArchive;
  renderProjects();
  if (!showArchive) $('#projects').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
});

function openStory(id, trigger, updateURL=true) {
  const project = content.projects.find(item => item.id === id);
  if (!project || (dialog.open && currentStoryId === id)) return;
  lastStoryTrigger = trigger;
  currentStoryId = id;
  $('#story-body').innerHTML = `
    <article class="story-content"><p class="story-kicker">${categories[project.category]} / ${escapeHTML(project.context)} / ${escapeHTML(project.year)}</p>
    <h2 id="story-title">${escapeHTML(project.title)}</h2><p class="story-lead">${escapeHTML(project.summary)}</p><div class="tag-list">${project.tags.map(tag=>`<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
    <div id="project-carousel"></div>
    ${project.sections.map(section=>`<section class="story-section"><h3>${escapeHTML(section.heading)}</h3><p>${escapeHTML(section.text)}</p></section>`).join('')}
    <div class="story-result"><span>RESULTS</span><p>${escapeHTML(project.result)}</p></div>
    <div class="story-links">${project.repo ? `<a class="button button-dark" href="${escapeHTML(project.repo)}" target="_blank" rel="noopener noreferrer">View repository ↗</a>` : ''}<a class="text-link" href="${escapeHTML(project.source)}" target="_blank" rel="noopener">View source document ↗</a><button class="text-link" id="copy-story">Copy project link ↗</button></div>
    <p class="story-source">Source: ${escapeHTML(project.source_label)}. Photographs and CAD images are from my engineering portfolio. Schematic illustrations summarise the project approach.</p></article>`;
  const slides = [{image:project.image, diagram:project.diagram, title:project.title, description:project.image_description || project.summary, context:project.image ? 'Project image' : 'System overview'},
    ...(project.gallery || []).map(image=>({image:image.image,title:image.caption,description:image.description,context:'Technical documentation'}))];
  $('#project-carousel').append(createCarousel(slides,{label:`${project.title} images`,className:'story-carousel'}));
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.body.classList.add('dialog-open');
  if (updateURL) {
    const returnHash = location.hash;
    const reuseEntry = history.state?.closedPortfolioStory === returnHash;
    setProjectHash(`#project/${encodeURIComponent(id)}`, reuseEntry, {portfolioStory:id, returnHash});
  }
  $('#copy-story').addEventListener('click', async () => {
    const button = $('#copy-story');
    const url = new URL(`#project/${project.id}`, 'https://tanjun8802.github.io/');
    try {
      await navigator.clipboard.writeText(url.href);
      button.textContent = 'Link copied ✓';
    } catch {
      // A selectable link remains usable when clipboard permissions are unavailable.
      const input = document.createElement('input');
      input.type = 'text'; input.value = url.href;
      input.setAttribute('aria-label','Project story link');
      button.replaceWith(input); input.focus(); input.select();
    }
  });
}

function setProjectHash(hash, replace=false, state=null) {
  try {
    if (replace) history.replaceState(state,'',hash || location.pathname + location.search);
    else history.pushState(state,'',hash);
  } catch {
    // Some browsers restrict History API updates for local files.
    if (replace) location.replace(hash);
    else location.hash = hash;
  }
}

function closeStory(updateURL=true) {
  if (dialog.open) dialog.close();
  currentStoryId = undefined;
  document.body.classList.remove('dialog-open');
  if (updateURL && location.hash.startsWith('#project/')) {
    const returnHash = history.state?.returnHash ?? '#projects';
    setProjectHash(returnHash, true, {closedPortfolioStory:returnHash});
  }
  const trigger = lastStoryTrigger;
  requestAnimationFrame(() => {
    if (dialog.open) return;
    if (trigger?.isConnected) trigger.focus({preventScroll:true});
    else {
      $('#projects-heading').focus({preventScroll:true});
      $('#projects').scrollIntoView({behavior:'instant'});
    }
  });
}
$('#close-story').addEventListener('click', () => closeStory());
dialog.addEventListener('cancel', event => {event.preventDefault(); closeStory();});
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeStory();
});
function syncStoryWithURL() {
  if (!content) return;
  const match = location.hash.match(/^#project\/([a-z0-9-]+)$/);
  if (match) openStory(match[1], null, false);
  else if (dialog.open) closeStory(false);
}
window.addEventListener('popstate',syncStoryWithURL);
window.addEventListener('hashchange',syncStoryWithURL);
// Observe the rendered graph so its paths follow larger text and responsive wrapping.
const graphObserver = new ResizeObserver(() => { if (content) drawGraph(); });
graphObserver.observe($('#commit-list'));
document.fonts.ready.then(() => { if (content) drawGraph(); });

const embeddedContent = $('#portfolio-data');
const portfolioContent = embeddedContent
  ? Promise.resolve().then(() => JSON.parse(embeddedContent.textContent))
  : fetch('data.json').then(response => {
      if (!response.ok) throw new Error(`Content request failed: ${response.status}`);
      return response.json();
    });
portfolioContent.then(data => {
  content = data;
  selectedCommit = content.journey[0]?.id;
  $('#hero-highlights').replaceChildren(createCarousel(content.highlights,{label:'Selected project photographs',className:'highlights-carousel'}));
  renderGraph(); renderInspector(); renderProjects(); syncStoryWithURL();
}).catch(error => {
  console.error(error);
  $('#commit-list').innerHTML = '<p class="load-error">The interactive stories could not load. Please refresh, or read the CV linked below.</p>';
  $('#project-grid').innerHTML = '<p class="load-error">The project archive could not load. <a href="attachments/Jun%20Tan%20Portfolio.pdf">Read the original portfolio ↗</a></p>';
  $('#show-projects').hidden = true;
});
