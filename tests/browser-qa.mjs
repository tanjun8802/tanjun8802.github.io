/** Run with the documented CUA tab in the Codex browser. No separate browser driver. */
export async function runPortfolioQA(tab) {
  const results = [];
  const check = (name, passed) => {
    results.push({name, passed});
    if (!passed) throw new Error(`FAIL: ${name}`);
  };
  await tab.playwright.locator('.highlights-carousel .carousel-project-link').press('ArrowRight');
  check('Carousel project link retains keyboard focus', await tab.playwright.evaluate(() => document.activeElement.matches('.carousel-project-link')));
  await tab.playwright.locator('.highlights-carousel .carousel-next').press('End');
  check('Carousel End selects final image', await tab.playwright.locator('.highlights-carousel .carousel-counter').textContent() === '5 / 5');
  await tab.playwright.locator('.highlights-carousel .carousel-next').press('Home');
  check('Carousel Home selects first image', await tab.playwright.locator('.highlights-carousel .carousel-counter').textContent() === '1 / 5');
  await tab.playwright.getByRole('searchbox', {name:'Search projects'}).fill('arduino mega');
  check('Search includes full project stories', await tab.playwright.locator('#project-count').textContent() === '1 project');
  await tab.playwright.getByRole('searchbox', {name:'Search projects'}).fill('no-such-project-928');
  check('No-results recovery is visible', await tab.playwright.getByRole('button', {name:'Clear filters'}).isVisible());
  await tab.playwright.getByRole('button', {name:'Clear filters'}).click();
  check('Reset restores selected projects', await tab.playwright.locator('#project-count').textContent() === '6 of 15 projects');
  await tab.playwright.getByRole('button',{name:'AI & machine learning',exact:true}).click();
  check('Category filtering works', await tab.playwright.locator('#project-count').textContent() === '5 projects');
  await tab.playwright.getByRole('button',{name:'All projects',exact:true}).click();
  await tab.playwright.getByRole('button',{name:'Explore all 15 projects'}).click();
  const cards = await tab.playwright.locator('.project-card').all();
  check('Archive exposes fifteen projects', cards.length === 15);
  for (const card of cards) {
    const id = await card.getAttribute('data-id');
    await card.locator('summary').press('Enter');
    await card.locator('.project-case-study').press('Enter');
    check(`Project ${id} opens`, await tab.playwright.locator('#story-dialog').getAttribute('open') !== null);
    await tab.playwright.getByRole('button',{name:'Close project details',exact:true}).press('Escape');
    check(`Project ${id} closes and restores focus`, await tab.playwright.evaluate(() => !document.querySelector('#story-dialog').open && document.activeElement.matches('.project-case-study')));
    await card.locator('summary').press('Enter');
  }
  await tab.playwright.getByRole('button',{name:'Work',exact:true}).click();
  check('Work branch contains three roles', await tab.playwright.locator('#commit-count').textContent() === '3 milestones');
  await tab.playwright.locator('.commit-row').first().press('ArrowDown');
  check('Timeline keyboard selection changes detail', await tab.playwright.locator('#commit-inspector h3').textContent() === 'Allye Energy');
  await tab.playwright.getByRole('button',{name:'All branches',exact:true}).click();
  check('Page has no broken images', await tab.playwright.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0)));
  check('Layout has no horizontal overflow', await tab.playwright.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  return results;
}
