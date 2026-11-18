# Jun Tan — personal portfolio

A responsive GitHub Pages portfolio with project stories, captioned galleries and an interactive education/work timeline. Text and pictures are maintained locally through a content editor. The public website has no account system, database or runtime dependencies.

## Preview

Requires Python 3.10 or newer. From the project folder:

```sh
python3 scripts/site.py build
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the website preview](http://localhost:8000/dist/) or [the content editor](http://localhost:8000/editor.html). Rebuild after saving content, then refresh the preview. The repository root is source code; **only `dist/` is published**.

For a portable preview that opens without a server:

```sh
python3 scripts/build-preview.py /path/to/portfolio-preview.html
```

Run the public build first. The portable file embeds content, styles, scripts, images and the public technical portfolio.

## Update words and pictures

See [the editing guide](docs/CONTENT-EDITOR.md). Use the editor to edit stories and captions, add photographs, reorder projects and update education/work entries. Save to the project folder in browsers supporting folder access, or download the changed JSON and pictures. The editor never publishes automatically.

`data.json` is the source for the profile, introduction, chronological story, interests, projects, galleries, timeline and printable CV. The first six projects are featured. Keep project IDs stable so shared links continue to work. Layout and fixed navigation labels live in `templates/index.html`; styles are in `css/style.css` and interactions in `js/script.js`.

Validate and rebuild before committing:

```sh
python3 scripts/site.py validate
python3 -m unittest discover -s tests -v
python3 scripts/site.py build
```

Validation identifies missing pictures, duplicate IDs, invalid references, unsafe links and incomplete content using the field's path. Existing pictures are retained when replaced; remove unused files deliberately after checking references.

## GitHub Pages release

The pull request adds `.github/workflows/pages.yml`. PRs run checks and produce a Pages artifact. Deployment runs only after a merge/push to `main` or a manual workflow run on `main`.

Before the first release, select **Settings → Pages → Build and deployment → Source: GitHub Actions** in the repository. See [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Merge the reviewed PR, then check the Actions deployment result. The intended public address is [tanjun8802.github.io](https://tanjun8802.github.io/).

The build includes the generated homepage and CV, site styles/scripts, referenced images, and `attachments/Jun Tan Portfolio.pdf`. It excludes the editor, tests, tooling and original CV. The original phone-bearing CV is ignored locally and removed from the proposed repository tree; prior Git history is not rewritten. Do not switch to publishing the repository root.

## Content provenance

The supplied CV and engineering portfolio are the primary sources. Project repositories were matched to Jun's public GitHub profile. LinkedIn could not be retrieved, so no facts were inferred from it. Jun confirmed the MSc was completed in September 2026. Team outcomes and simulations are described as such. Illustrative ML diagrams are explanatory graphics, not experimental results or photographs.

## Checks and accessibility

`tests/test_site.py` exercises the public validation/build CLI. `tests/browser-qa.mjs` runs through an existing CUA browser tab and covers the public visitor interface; it is not part of headless CI. See [verification notes](docs/VERIFICATION.md) for completed checks and limits.

Native disclosures support keyboard and touch as well as mouse hover. Project dialogs restore focus and support Escape and browser history. Carousels advance manually with buttons and keyboard controls. Timeline branches support arrow keys. Responsive layouts, reduced motion, visible focus, a skip link, static project summaries and a printable CV provide accessible alternatives.
