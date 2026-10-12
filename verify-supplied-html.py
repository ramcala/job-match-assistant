"""Regression check: python3 verify-supplied-html.py PATH_TO_POST_HTML.

Requires lxml. Never fetches external resources.
The user's HTML is deliberately not included in the distributable.
"""
import re
import sys
from pathlib import Path
from lxml import html

def select(root, selector):
    # Translate the limited selector forms used by this extension into XPath.
    paths = []
    for part in selector.split(', '):
        if ' > ' in part:
            parent, child = part.split(' > ')
            paths.append(f'.//*[contains(concat(" ",normalize-space(@class)," ")," {parent[1:]} ")]/{child}')
        elif part.startswith('.'):
            paths.append(f'.//*[contains(concat(" ",normalize-space(@class)," ")," {part[1:]} ")]')
        elif part.startswith('['):
            predicates = []
            for attr, op, value in re.findall(r'\[([\w-]+)(\^?=)"([^"]*)"\]', part):
                predicates.append(f'starts-with(@{attr},"{value}")' if op == '^=' else f'@{attr}="{value}"')
            assert predicates, part
            paths.append('.//*[' + ' and '.join(predicates) + ']')
        else:
            assert re.fullmatch('[a-z]+', part), part
            paths.append('.//' + part)
    return root.xpath(' | '.join(paths))

source = Path(__file__).with_name('search-posts.js').read_text()
markup = Path(sys.argv[1]).read_text()
cards = re.search(r"const cards = '(.*?)';", source).group(1)
texts = re.search(r"const texts = '(.*?)';", source).group(1)
soup = html.fromstring('<main>' + markup + '</main>')
legacy = cards.split(', ', 1)[1]
assert len(select(soup, legacy)) == 0, 'Fixture should reproduce the old missing-card failure'
found = select(soup, cards)
assert len(found) == 1, f'Expected one post, found {len(found)}'
body = select(found[0], texts)
assert len(body) == 1, 'Expected one post body'
text = '\n'.join(body[0].itertext())
assert 'HIRING | DEVOPS ENGINEER' in text
assert 'Terraform and Ansible' in text
assert 'Only candidates from Ahmedabad and Gandhinagar will be considered.' in text
assert 'Founder' not in text, 'Author bio leaked into job description'
assert '61,656 members' not in text, 'Group metadata leaked into job description'
# Two independently loaded copies must yield two bounded post bodies, not one list.
two = html.fromstring('<main>' + markup + markup + '</main>')
assert len(select(two, cards)) == 2
assert all(len(select(card, texts)) == 1 for card in select(two, cards))
print('PASS: supplied HTML reproduces old zero-card failure; fixed selector finds one post; body preserves job requirements, excludes author/group metadata; two-post isolation holds.')
