"""Source-bound mathematical appendix; preserve prior manual pages, not its credentials."""
import hashlib,importlib.util,json,re,subprocess
from pathlib import Path
import fitz
ROOT=Path(__file__).resolve().parents[1]
BASE='b7d7b09a5f443b68cb082ced5e40f39d8950d6f6'
def sha(b):return hashlib.sha256(b).hexdigest()
def main():
 import argparse
 ap=argparse.ArgumentParser();ap.add_argument('--manual',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
 spec=importlib.util.spec_from_file_location('handbook',ROOT/'scripts/build-release-handbook.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
 input_hash=sha(Path(a.manual).read_bytes());canonical_pdf=subprocess.check_output(['git','show',BASE+':site/Petal_Realms_Handbook.pdf'],cwd=ROOT)
 assert input_hash in (sha(canonical_pdf),'b51846f5cb69f0cc6e94916f1f8e7e6105331e0aac76288fa91878e74bfb62ac'),'Input handbook identity differs from pinned V5.21/Library version 8'
 for source in ['site/index.html','site/rules.js','docs/standard/ruleset.json','docs/standard/mechanisms.json','scripts/build-release-handbook.py']:
  assert (ROOT/source).read_bytes()==subprocess.check_output(['git','show',BASE+':'+source],cwd=ROOT),'Source differs from baseline: '+source
 files=subprocess.check_output(['git','ls-tree','-rz','--name-only',BASE],cwd=ROOT).decode().strip('\0').split('\0');rows=[];functions=[]
 for p in files:
  raw=subprocess.check_output(['git','show',BASE+':'+p],cwd=ROOT);rows.append({'path':p,'bytes':len(raw),'sha256':sha(raw)})
  if p.startswith(('site/','functions/')) and p.endswith(('.js','.html')):
   text=raw.decode()
   for m in re.finditer(r'\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(',text):functions.append({'path':p,'name':m[1],'line':text.count('\n',0,m.start())+1})
 data=h.load_source();catalog={'baseline':BASE,'fileCount':len(rows),'scope':'Complete baseline file hashes and data definitions; lexical named-function anchors only, not an AST call graph or proof of anonymous callbacks. No player data.','files':rows,'namedFunctionAnchors':functions,'definitions':data,'mechanismContracts':json.loads((ROOT/'docs/standard/mechanisms.json').read_text()),'rules':json.loads((ROOT/'docs/standard/ruleset.json').read_text()),'independentVerification':{'finiteStockCases':2340,'actualAllCraftPaths':3004,'scope':'bounded event-tree enumeration, not Monte Carlo nor all stocks up to 99999'}}
 payload=json.dumps(catalog,ensure_ascii=False,indent=2).encode();p=ROOT/'docs/manual/PROBABILITY_AUDIT_CATALOG.json';p.write_bytes(payload+b'\n')
 body='<h1>'+h.tx('概率与数学期望 · 审计补编')+'</h1>'+h.para('2026-10-28 / V5.21.0。配合现行玩家手册与工程补编阅读。以下为当前规则的条件性推导，不是概率保底、统计独立性或无缺陷保证。')
 for s in (ROOT/'docs/manual/PROBABILITY_FOUNDATIONS.md').read_text().split('\n\n')[1:]:
  if s.startswith('## '):body+=h.heading(s[3:])
  else:body+=h.para(s)
 body+=h.heading('10 源码、数据与复现目录')+h.para('本 PDF 附件 PROBABILITY_AUDIT_CATALOG.json 包含全部143个基线文件摘要、现行具名函数定位，以及29类花瓣、43种生物、8个区域、品质、天赋、槽位和规则参数完整定义。定位为词法函数声明清单，不包含所有匿名回调，也不冒充完整调用图。完整程序以固定提交的源码为准。')+h.para('附加目录 SHA-256（两段连续连接）：')+h.para(sha(payload+b'\n')[:32]+' '+sha(payload+b'\n')[32:])+h.para('源码 https://github.com/liuzhide666/Petal-Realms/tree/'+BASE)+h.para('复现：npm ci；npm test；node scripts/analyze-balance.cjs；python3 scripts/build-probability-audit.py --manual 原手册.pdf --output 新手册.pdf。独立测试位于 tests/probability_independent.cjs，理论文稿位于 docs/manual/PROBABILITY_FOUNDATIONS.md。')
 arc,_,_=h.fonts();supp,_=h.render(body,'MATH 2026-10-28',arc);old=fitz.open(a.manual);assert len(old)==365
 full=fitz.open();full.insert_pdf(old);full.insert_pdf(supp);full.embfile_add('PROBABILITY_AUDIT_CATALOG.json',payload+b'\n',filename='PROBABILITY_AUDIT_CATALOG.json',desc='Source hashes, formula parameters and named function anchors')
 for x in range(1,full.xref_length()):
  if full.xref_get_key(x,'Type')==('name','/EmbeddedFile'):
   full.xref_set_key(x,'Params/CreationDate','(D:20261028000000Z)');full.xref_set_key(x,'Params/ModDate','(D:20261028000000Z)')
 full.set_toc(old.get_toc()+[[1,'概率与数学期望审计补编（2026-10-28）',366]])
 out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True);assert out.resolve()!=Path(a.manual).resolve();full.set_metadata({'title':'Petal Realms V5.21 mathematical audit edition 2026-10-28','author':'Petal Realms','creationDate':'D:20261028000000Z','modDate':'D:20261028000000Z'});full.xref_set_key(-1,'ID','null');full.save(out,garbage=4,deflate=True,no_new_id=True)
 check=fitz.open(out)
 for i in range(len(old)):
  assert old[i].get_text()==check[i].get_text()
  assert b''.join(old.xref_stream(x) for x in old[i].get_contents())==b''.join(check.xref_stream(x) for x in check[i].get_contents())
 assert check.embfile_get('PROBABILITY_AUDIT_CATALOG.json')==payload+b'\n'
 for i in range(365,len(check)):
  for b in check[i].get_text('blocks'):assert b[0]>=35 and b[2]<=560 and b[1]>=20 and b[3]<=825,(i,b[:4])
 receipt={'base':BASE,'inputManualSha256':input_hash,'canonicalGitManualSha256':sha(canonical_pdf),'pages':len(check),'appendixPages':len(supp),'preservedPages':len(old),'baselineFiles':len(rows),'namedFunctionAnchors':len(functions),'catalogSha256':sha(payload+b'\n'),'pdfSha256':sha(out.read_bytes()),'independentTests':catalog['independentVerification'],'websiteManual':'365 pages; not overwritten by this audit edition'}
 (ROOT/'artifacts/qa').mkdir(parents=True,exist_ok=True);(ROOT/'artifacts/qa/probability_audit_20261028.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2));print(json.dumps(receipt))
if __name__=='__main__':main()
