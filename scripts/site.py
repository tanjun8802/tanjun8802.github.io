"""Validate portfolio content and build the public GitHub Pages artifact."""
import argparse
import json
import html
import hashlib
import shutil
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def validate(data):
    errors = []
    def require(obj, fields, path):
        if not isinstance(obj, dict):
            errors.append(f'{path}: expected an object')
            return False
        for key in fields:
            if not isinstance(obj.get(key), str) or not obj[key].strip():
                errors.append(f'{path}.{key}: enter non-empty text')
        return True
    if not isinstance(data, dict):
        return ['content: expected a JSON object']
    require(data.get('profile'), ['name','email','github','linkedin','specialism','introduction','story','title'], 'profile')
    fields = {
        'projects':['id','title','category','context','year','summary','result','source','source_label'],
        'journey':['id','branch','year','date','label','organization','role','summary','source','source_label'],
        'highlights':['image','title','context','description'],
        'interests':['id','title','text','stat','detail'],
    }
    for group, required in fields.items():
        if not isinstance(data.get(group), list) or not data[group]:
            errors.append(f'{group}: add at least one item')
            continue
        ids = set()
        for i, item in enumerate(data[group]):
            path = f'{group}[{i}]'
            if not require(item, required, path):
                continue
            if 'id' in required:
                identity = item.get('id', '')
                if not isinstance(identity, str) or not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', identity):
                    errors.append(f'{path}.id: use lowercase words separated by hyphens')
                elif identity in ids:
                    errors.append(f'{path}.id: duplicate ID {identity}')
                ids.add(str(identity))
            for key in (['tags', 'sections'] if group == 'projects' else ['tags','highlights'] if group == 'journey' else []):
                if not isinstance(item.get(key), list) or not item[key]:
                    errors.append(f'{path}.{key}: add at least one item')
                elif key == 'sections':
                    for j, section in enumerate(item[key]):
                        require(section, ['heading','text'], f'{path}.sections[{j}]')
                elif any(not isinstance(v, str) or not v.strip() for v in item[key]):
                    errors.append(f'{path}.{key}: each item must be non-empty text')
            if group == 'projects':
                if item.get('category') not in ['ai','robotics','engineering']:
                    errors.append(f'{path}.category: choose ai, robotics or engineering')
                if not item.get('image') and item.get('diagram') not in ['gik','qleac','mase','transfer','golf']:
                    errors.append(f'{path}.diagram: choose a supported diagram or supply an image')
                if item.get('gallery') is not None:
                    if not isinstance(item['gallery'], list):
                        errors.append(f'{path}.gallery: expected a list')
                    else:
                        for j, slide in enumerate(item['gallery']):
                            require(slide, ['image','caption','description'], f'{path}.gallery[{j}]')
            if group == 'journey' and item.get('branch') not in ['education','work','life']:
                errors.append(f'{path}.branch: choose education, work or life')
    project_ids = {p.get('id') for p in data.get('projects', []) if isinstance(p, dict) and isinstance(p.get('id'),str)} if isinstance(data.get('projects'),list) else set()
    def walk(value, field=''):
        if isinstance(value, dict):
            for key, child in value.items():
                name = f'{field}.{key}' if field else key
                if key == 'project' and (not isinstance(child, str) or child not in project_ids):
                    errors.append(f'{name}: unknown project {child}')
                if key in ['image','source','repo','github','linkedin','portfolio','cv','url','path']:
                    if not isinstance(child, str):
                        errors.append(f'{name}: expected a link or file path')
                        continue
                    if key == 'image' and not child and field.startswith('projects[') and value.get('diagram') in ['gik','qleac','mase','transfer','golf']:
                        continue
                    url = urlsplit(child)
                    local = unquote(url.path)
                    if url.scheme or url.netloc:
                        if url.scheme != 'https' or not url.netloc or key == 'image':
                            errors.append(f'{name}: use an HTTPS link or a local image')
                    elif key == 'image':
                        path = (ROOT / local).resolve()
                        if not path.is_relative_to(ROOT / 'assets/images') or path.suffix.lower() not in ['.jpg','.jpeg','.png','.webp','.avif']:
                            errors.append(f'{name}: image must be inside assets/images and use JPG, PNG, WebP or AVIF')
                        elif not path.is_file():
                            errors.append(f'{name}: image not found: {child}')
                    elif local not in ['cv.html', 'attachments/Jun Tan Portfolio.pdf']:
                        errors.append(f'{name}: file is not in the public document list: {child}')
                    elif local == 'cv.html' and url.fragment not in ['', 'education','experience','research']:
                        errors.append(f'{name}: unknown CV section: {url.fragment}')
                walk(child, name)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                walk(child, f'{field}[{index}]')
    walk(data)
    return errors


def build(data, output):
    data = {key: value for key, value in data.items() if key != 'editorial_notes'}
    output = output.resolve()
    if output == ROOT or ROOT.is_relative_to(output):
        raise ValueError('Choose a separate output directory, such as dist.')
    if output.exists() and any(output.iterdir()) and not (output / '.portfolio-build').is_file():
        raise ValueError('Output is not empty and is not a portfolio build directory.')
    output.mkdir(parents=True, exist_ok=True)
    # Rebuild our artifact only; never copy repository internals or original CVs.
    for path in output.iterdir():
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
    esc = html.escape
    profile = data['profile']
    template = (ROOT / 'templates/index.html').read_text()
    for asset in ['js/script.js', 'css/style.css']:
        digest = hashlib.sha256((ROOT / asset).read_bytes()).hexdigest()[:12]
        template = template.replace(asset + '"', asset + '?v=' + digest + '"')
    values = {key: esc(str(value), quote=True) for key, value in profile.items()}
    first_slide = data['highlights'][0]
    values.update({f'hero_{key}': esc(first_slide[key], quote=True) for key in ['image','title','context','description']})
    values['gallery_count'] = f"01–{len(data['highlights']):02}"
    values['content_json'] = json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')
    values['interests'] = ''.join(
        '<article class="life-card"><span class="mono">' + f'{i+1:02} / INTERESTS' + '</span>'
        + (f'<div class="interest-image"><img src="{esc(item["image"])}" alt="{esc(item["title"])}" loading="lazy"></div>' if item.get('image') else '')
        + f'<h3>{esc(item["title"])}</h3><p>{esc(item["text"])}</p><div class="life-stat"><strong>{esc(item["stat"])}</strong></div><p class="life-caption">{esc(item["detail"])}</p></article>'
        for i, item in enumerate(data['interests']))
    values['projects'] = ''.join(f'<article class="project-card static-project"><h3>{esc(p["title"])}</h3><p>{esc(p["summary"])}</p><a class="text-link" href="{esc(p["source"])}">Read source document →</a></article>' for p in data['projects'][:6])
    output.joinpath('index.html').write_text(re.sub(r'{{([a-z_]+)}}', lambda m: values[m[1]], template))
    cv_sections = []
    for branch, anchor, title in [('education', 'education', 'Education'), ('work', 'experience', 'Professional experience')]:
        entries = []
        for item in data['journey']:
            if item['branch'] != branch or item['id'] == 'southampton-start':
                continue
            entries.append(f'<article class="cv-entry"><p class="eyebrow">{esc(item["date"])}</p><h3>{esc(item["organization"])}</h3><p class="cv-role">{esc(item["role"])}</p><p>{esc(item["summary"])}</p><ul>' + ''.join(f'<li>{esc(line)}</li>' for line in item['highlights']) + '</ul></article>')
        cv_sections.append(f'<section id="{anchor}"><h2>{title}</h2>' + ''.join(entries) + '</section>')
    cv_sections.append('<section id="research"><h2>Selected research and projects</h2><ul class="cv-research">' + ''.join(f'<li><a href="./#project/{esc(p["id"])}">{esc(p["title"])}</a><p>{esc(p["summary"])}</p></li>' for p in data['projects'] if p['category'] == 'ai') + '</ul></section>')
    cv = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>CV — ' + values['name'] + '</title><link rel="stylesheet" href="css/style.css"><link rel="icon" href="assets/favicon.svg"></head><body class="cv-page"><a class="skip-link" href="#cv-main">Skip to CV</a><header class="site-header"><nav class="nav wrap" aria-label="CV navigation"><a class="wordmark" href="./">' + values['name'] + '</a><a class="text-link" href="./">Back to portfolio →</a></nav></header><main class="wrap cv-document" id="cv-main"><div class="cv-intro"><p class="eyebrow">Curriculum vitae</p><h1>' + values['name'] + '</h1><p>' + values['specialism'] + '</p><div class="cv-links"><a href="mailto:' + values['email'] + '">Email</a><a href="' + values['linkedin'] + '">LinkedIn</a><a href="' + values['github'] + '">GitHub</a></div></div>' + ''.join(cv_sections) + '</main></body></html>'
    output.joinpath('cv.html').write_text(cv)
    for folder, names in [('css', ['style.css']), ('js', ['script.js'])]:
        output.joinpath(folder).mkdir()
        for name in names:
            shutil.copy2(ROOT / folder / name, output / folder / name)
    image_paths = set()
    def collect_images(value):
        if isinstance(value, dict):
            if value.get('image'):
                image_paths.add(unquote(urlsplit(value['image']).path))
            for child in value.values():
                collect_images(child)
        elif isinstance(value, list):
            for child in value:
                collect_images(child)
    collect_images(data)
    for asset in image_paths | {'assets/favicon.svg'}:
        target = output / asset
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / asset, target)
    output.joinpath('attachments').mkdir()
    shutil.copy2(ROOT / 'attachments/Jun Tan Portfolio.pdf', output / 'attachments/Jun Tan Portfolio.pdf')
    output.joinpath('data.json').write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    output.joinpath('.nojekyll').touch()
    output.joinpath('.portfolio-build').touch()
    output.joinpath('404.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Jun Tan</title><link rel="stylesheet" href="/css/style.css"><main class="wrap section"><p class="eyebrow">404</p><h1>Page not found</h1><p>This page may have moved. Return to the portfolio to explore my work.</p><a class="button button-dark" href="/">Back to portfolio →</a></main></html>')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['validate', 'build'])
    parser.add_argument('--content', type=Path, default=ROOT / 'data.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'dist')
    args = parser.parse_args()
    try:
        data = json.loads(args.content.read_text())
        errors = validate(data)
    except (OSError, ValueError) as error:
        errors = [str(error)]
    if errors:
        print('\n'.join(errors), file=sys.stderr)
        return 1
    if args.command == 'build':
        try:
            build(data, args.output)
        except (OSError, ValueError) as error:
            print(str(error), file=sys.stderr)
            return 1
        print(f'Built public site: {args.output}')
    else:
        print('Content valid.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
