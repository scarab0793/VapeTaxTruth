"""Refresh data/news.json from the GOV.UK Search API (free, no key needed).

Design rules:
- Only keep results that actually mention vaping in the title.
- One failing query never wipes existing data; if every query fails the file is left untouched.
- Results are merged with what is already stored, de-duplicated by URL and sorted newest first.
"""
import datetime
import json
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

OUT = pathlib.Path('data/news.json')
QUERIES = ['vaping products duty', 'vaping duty stamps']
FIELDS = ['title', 'link', 'description', 'public_timestamp', 'content_store_document_type']
MAX_ITEMS = 40

CATEGORY = {
    'press_release': 'Press release',
    'news_story': 'Press release',
    'consultation_outcome': 'Policy',
    'policy_paper': 'Policy',
    'impact_assessment': 'Policy',
    'notice': 'Notice',
    'statutory_instrument': 'Law',
}


def fetch(query):
    params = [('q', query), ('count', '40')] + [('fields', f) for f in FIELDS]
    url = 'https://www.gov.uk/api/search.json?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': 'VapeTaxTruth public interest feed reader/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response).get('results', [])


def relevant(row):
    return 'vap' in (row.get('title') or '').lower()


def to_item(row):
    link = row.get('link', '')
    if not link.startswith('/') or link.startswith('//'):
        return None
    return {
        'title': row.get('title', 'Official update').strip(),
        'url': 'https://www.gov.uk' + link,
        'date': row.get('public_timestamp'),
        'source': 'GOV.UK',
        'category': CATEGORY.get(row.get('content_store_document_type'), 'Guidance'),
    }


def main():
    existing = {}
    if OUT.exists():
        try:
            for item in json.loads(OUT.read_text()).get('items', []):
                if 'vap' in item.get('title', '').lower():
                    existing[item['url']] = item
        except (ValueError, KeyError):
            pass

    fetched = 0
    for query in QUERIES:
        try:
            rows = fetch(query)
        except (urllib.error.URLError, TimeoutError, ValueError) as exc:
            print('Query failed, continuing:', query, type(exc).__name__)
            continue
        fetched += 1
        for row in rows:
            if not relevant(row):
                continue
            item = to_item(row)
            if item:
                existing[item['url']] = item

    if fetched == 0:
        print('Every query failed; leaving data/news.json unchanged.')
        return 0

    items = sorted(existing.values(), key=lambda i: i.get('date') or '', reverse=True)[:MAX_ITEMS]
    payload = {
        'updated': datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat(),
        'items': items,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n')
    print(f'Wrote {len(items)} items.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
