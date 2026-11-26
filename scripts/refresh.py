import json, urllib.request, urllib.parse, datetime, pathlib
params=urllib.parse.urlencode({'q':'vaping products duty','count':20,'order':'-public_timestamp'})
url='https://www.gov.uk/api/search.json?'+params
with urllib.request.urlopen(url,timeout=30) as response:
    data=json.load(response)
items=[]
seen=set()
for row in data.get('results',[]):
    link=row.get('link','')
    if not link.startswith('/') or link.startswith('//') or link in seen: continue
    seen.add(link)
    items.append({'title':row.get('title','Official update'),'url':'https://www.gov.uk'+link,'date':row.get('public_timestamp')})
pathlib.Path('data/news.json').write_text(json.dumps({'updated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':items},indent=2)+'\n')
