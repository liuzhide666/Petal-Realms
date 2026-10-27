"""Read every tracked/authored file; record structural checks, not a semantic proof."""
import ast,hashlib,json,subprocess,zipfile
from pathlib import Path
from html.parser import HTMLParser
import fitz
ROOT=Path(__file__).resolve().parents[1]
class Scripts(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.current=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='script' and not a.get('src') and a.get('type','text/javascript') in ('text/javascript','application/javascript','module'):self.current=[]
 def handle_data(self,data):
  if self.current is not None:self.current.append(data)
 def handle_endtag(self,tag):
  if tag=='script' and self.current is not None:self.parts.append(''.join(self.current));self.current=None
def main():
 paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
 records=[]
 for name in sorted(set(filter(None,paths))):
  if name in ('docs/qa/V5.21_FILE_AUDIT.json',):continue # no self-referential digest
  p=ROOT/name;b=p.read_bytes();checks=['read-complete','sha256'];role='historical' if name.startswith(('releases/','docs/history/','database/migrations/')) else 'current'
  if p.suffix in ('.js','.mjs','.cjs'):
   subprocess.run(['node','--check',str(p)],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE);checks+=['node-syntax']
  elif p.suffix=='.py':ast.parse(b.decode(),filename=name);checks+=['python-ast']
  elif p.suffix=='.json':json.loads(b);checks+=['json-parse']
  elif p.suffix=='.html':
   parser=Scripts();parser.feed(b.decode())
   for s in parser.parts:subprocess.run(['node','-e',"new (require('vm').Script)(require('fs').readFileSync(0,'utf8'))"],input=s.encode(),check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
   checks+=['html-script-syntax']
  elif p.suffix=='.zip':
   with zipfile.ZipFile(p) as z:
    assert z.testzip() is None,name
    assert all(not Path(x.filename).is_absolute() and '..' not in Path(x.filename).parts for x in z.infolist()),name
   checks+=['zip-crc','zip-safe-paths']
  elif p.suffix=='.png':
   from PIL import Image
   with Image.open(p) as image:image.verify()
   checks+=['png-decode']
  elif p.suffix=='.pdf':
   with fitz.open(p) as d:assert len(d)>0 and all(page.get_text().strip() for page in d),name
   checks+=['pdf-page-text']
  else:
   b.decode('utf8');checks+=['utf8']
  records.append({'path':name,'role':role,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'checks':checks})
 result={'version':'5.21.0','scope':'Every tracked or authored non-ignored file except this self-referential receipt; historical files retain their version scope. Structural checks are not line-by-line semantic certification. Third-party node_modules excluded; npm lock/audit used separately.','files':len(records),'success':True,'records':records}
 (ROOT/'docs/qa/V5.21_FILE_AUDIT.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'files':len(records),'success':True}))
if __name__=='__main__':main()
