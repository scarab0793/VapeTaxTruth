import json, urllib.request, urllib.parse, datetime, pathlib, xml.etree.ElementTree as ET
path=pathlib.Path('data/reddit.json')
url='https://www.reddit.com/search.rss?'+urllib.parse.urlencode({'q':'"vaping products duty" OR "UK vape tax"','sort':'new'})
try:
    req=urllib.request.Request(url,headers={'User-Agent':'VapeTaxTruth public interest feed reader/1.0'})
    with urllib.request.urlopen(req,timeout=25) as r: root=ET.fromstring(r.read())
    ns={'a':'http://www.w3.org/2005/Atom'}
    items=[]
    for e in root.findall('a:entry',ns)[:20]:
        link=e.find('a:link',ns)
        if link is None: continue
        u=link.get('href','')
        if urllib.parse.urlparse(u).hostname not in ('www.reddit.com','reddit.com'): continue
        items.append({'title':e.findtext('a:title',default='',namespaces=ns),'url':u,'date':e.findtext('a:updated',default='',namespaces=ns)})
    path.write_text(json.dumps({'updated':datetime.datetime.now(datetime.timezone.utc).isoformat(),'items':items},indent=2)+'\n')
except Exception as e:
    print('Reddit feed unavailable; preserving previous data:',type(e).__name__)
