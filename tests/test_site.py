"""Public CLI regression tests: content edits must produce a safe, usable site."""
import json
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class SiteBuildTests(unittest.TestCase):
    def test_missing_image_reports_the_field_without_building(self):
        with tempfile.TemporaryDirectory() as temp:
            content = json.loads((ROOT / 'data.json').read_text())
            content['projects'][0]['image'] = 'assets/images/missing-photo.jpg'
            source = Path(temp) / 'data.json'
            source.write_text(json.dumps(content))
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/site.py'), 'validate', '--content', str(source)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('projects[0].image', result.stderr)
            self.assertIn('missing-photo.jpg', result.stderr)

    def test_build_reflects_profile_and_excludes_private_files(self):
        with tempfile.TemporaryDirectory() as temp:
            data = json.loads((ROOT / 'data.json').read_text())
            data['profile']['name'] = 'Example Engineer'
            data['journey'][0]['summary'] = 'An updated education story.'
            source = Path(temp) / 'content.json'
            source.write_text(json.dumps(data))
            output = Path(temp) / 'public'
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/site.py'), 'build', '--content', str(source), '--output', str(output)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            for page in ['index.html', 'cv.html']:
                self.assertIn('Example Engineer', (output / page).read_text())
            self.assertIn('An updated education story.', (output / 'cv.html').read_text())
            self.assertTrue((output / 'assets/images/portfolio-03-3.jpg').is_file())
            self.assertFalse((output / 'editor.html').exists())
            self.assertEqual([p.name for p in (output / 'attachments').iterdir()], ['Jun Tan Portfolio.pdf'])

    def test_invalid_content_is_rejected_with_actionable_fields(self):
        cases = [
            ('unsafe link', lambda d: d['projects'][0].update(repo='javascript:alert(1)'), 'projects[0].repo'),
            ('duplicate ID', lambda d: d['projects'][1].update(id=d['projects'][0]['id']), 'projects[1].id'),
            ('missing project', lambda d: d['highlights'][0].update(project='unknown-project'), 'highlights[0].project'),
            ('unknown diagram', lambda d: d['projects'][1].update(diagram='missing'), 'projects[1].diagram'),
            ('empty timeline', lambda d: d.update(journey=[]), 'journey'),
            ('private source', lambda d: d['projects'][0].update(source='attachments/Jun_Tan_CV_2026_Latest (3).pdf'), 'projects[0].source'),
        ]
        for label, edit, expected in cases:
            with self.subTest(label=label), tempfile.TemporaryDirectory() as temp:
                data = json.loads((ROOT / 'data.json').read_text())
                edit(data)
                path = Path(temp) / 'data.json'
                path.write_text(json.dumps(data))
                result = subprocess.run([sys.executable, str(ROOT / 'scripts/site.py'), 'validate', '--content', str(path)], capture_output=True, text=True)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(expected, result.stderr)

    def test_build_will_not_erase_an_unrelated_directory(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'existing'
            output.mkdir()
            keep = output / 'notes.txt'
            keep.write_text('Keep these notes.')
            result = subprocess.run([sys.executable, str(ROOT / 'scripts/site.py'), 'build', '--output', str(output)], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(keep.read_text(), 'Keep these notes.')

    def test_public_pages_have_working_local_assets_and_links(self):
        class Links(HTMLParser):
            def __init__(self):
                super().__init__()
                self.links = []
                self.ids = set()
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                self.ids.add(attrs.get('id'))
                for key in ['src','href']:
                    if attrs.get(key):
                        self.links.append(attrs[key])
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'public'
            subprocess.run([sys.executable, str(ROOT / 'scripts/site.py'), 'build', '--output', str(output)], check=True, capture_output=True)
            for page in output.glob('*.html'):
                parsed = Links()
                parsed.feed(page.read_text())
                for link in parsed.links:
                    url = urlsplit(link)
                    if url.scheme or url.netloc or url.fragment.startswith('project/'):
                        continue
                    target = output / unquote(url.path.lstrip('/')) if url.path else page
                    if target.is_dir():
                        target = target / 'index.html'
                    self.assertTrue(target.is_file(), f'{page.name}: missing {link}')
                    if url.fragment and target.suffix == '.html':
                        other = Links()
                        other.feed(target.read_text())
                        self.assertIn(url.fragment, other.ids, f'{page.name}: missing section {link}')
            source = (output / 'index.html').read_text()
            self.assertIn('Autonomous Navigation Rover', source)
            self.assertIn('aria-describedby="project-hint"', source)

if __name__ == '__main__':
    unittest.main()
