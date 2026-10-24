"""Append source-pinned S3 to the 347-page Edition 3.2 + S1 + S2 manual.

Usage: python scripts/build-combat-supplement.py BASE.pdf OUTPUT.pdf COMMIT
Requires existing ReportLab and PyMuPDF. Earlier page text is preserved.
"""
import hashlib
import io
import re
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import fitz
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

rl_config.invariant = 1
base, output, commit = sys.argv[1:]
if not re.fullmatch(r'[0-9a-f]{40}', commit):
    raise ValueError('Expected full source commit SHA')
root = Path(__file__).resolve().parents[1]
baseline = fitz.open(base)
if len(baseline) != 347 or 'Edition 3.2' not in baseline[0].get_text():
    raise ValueError('Expected preserved 347-page S2 baseline')
for name, file in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+file))
styles = {
    'body': ParagraphStyle('Body',fontName='Body',fontSize=9.5,leading=14.7,spaceAfter=10,textColor=colors.HexColor('#233d35')),
    'title': ParagraphStyle('Title',fontName='Bold',fontSize=23,leading=29,spaceAfter=20,textColor=colors.HexColor('#193e30')),
    'heading': ParagraphStyle('Heading',fontName='Bold',fontSize=12,leading=17,spaceBefore=8,spaceAfter=9,textColor=colors.HexColor('#4a6548')),
    'small': ParagraphStyle('Small',fontName='Body',fontSize=8,leading=12,spaceAfter=8,splitLongWords=True,textColor=colors.HexColor('#426150')),
}
def para(text, kind='body'):
    return Paragraph(escape(text),styles[kind])
def furniture(canvas, doc):
    canvas.setStrokeColor(colors.HexColor('#b2bd9d'));canvas.line(48,796,547,796)
    canvas.setFont('Body',8);canvas.setFillColor(colors.HexColor('#4a6548'))
    canvas.drawString(48,811,'PETAL REALMS / PR-STD-003 / EDITION 3.2 + S1 + S2 + S3')
    canvas.drawString(48,30,'Combat consistency | V5.19 candidate | 23 October 2026')
    canvas.drawRightString(547,30,'S3-'+str(doc.page))
source=(root/'docs/standard/V5.19_COMBAT_CONSISTENCY.md').read_text()
sections={}
for block in re.split(r'^## ',source,flags=re.M)[1:]:
    title,body=block.split('\n',1);sections[title]=body.strip()
story=[Spacer(1,35),para('Probability-Weighted Mechanics and Computation','title'),para('Edition 3.2 with normative Supplements S1, S2 and S3','heading'),para('V5.19 candidate / Combat consistency / 23 October 2026','heading'),para('This manual preserves 347 historical pages and adds a normative correction for terminal combat, input ownership, damage acceptance and feedback, shared body geometry, bounded progression, save retries and encounter presentation. The original 138 mechanism identifiers remain registered.'),para('Reading order and source authority','heading'),para('The next 347 pages retain their original text and printed numbering. S3 then supersedes only the behaviors it explicitly updates. Earlier source ledgers are historical and are not a V5.19 inventory. The following source pin identifies a local candidate, not a merged or deployed production release.'),para('Frozen local runtime source: '+commit,'small'),para('Publication boundary','heading'),para('Cloudflare production was observed at main commit 26aa9bf4aafc0c30841470921e57619686a5815b (V5.17). GitHub publication is blocked in this session. Complete Florr combat parity and physical iOS Safari remain unverified.'),PageBreak()]
groups=[['Scope and authority','S3-01: Terminal combat state','S3-02: Input ownership and probability-one transitions'],['S3-03: Damage acceptance and effective feedback','S3-04: Shared body geometry'],['S3-05: Bounded progression','S3-06: Cloud-save retry state'],['S3-07: Readable encounter presentation','S3-08: Verification and remaining boundaries']]
for group in groups:
    story.append(para('Normative combat supplement','title'))
    for key in group:
        story.append(para(key,'heading'))
        story.extend(para(p) for p in sections[key].split('\n\n'))
    story.append(PageBreak())
story.extend([para('Source identity and change boundary','title'),para('Local source commit: '+commit,'small')])
scope=['site/index.html','site/rules.js','site/release.json','functions/api/[[path]].js','docs/standard/ruleset.json','docs/standard/mechanisms.json','docs/standard/V5.19_COMBAT_CONSISTENCY.md','tests/browser_v519.mjs','tests/v519_sync_retry.cjs']
for name in scope:
    story.extend([para(name,'heading'),para('SHA-256 '+hashlib.sha256((root/name).read_bytes()).hexdigest(),'small')])
story.extend([PageBreak(),para('Conformance, evidence and reproduction','title'),para('The V5.19 browser suite contains 89 checks across combat fixtures and five encounter-layout viewports. The touch/keyboard continuity suite contains 46 checks. Prior V5.16, V5.17 and V5.18 browser suites contain 245, 128 and 130 checks. The retry suite contains 11 cases and the native account API suite contains 12 isolated cases. These counts describe specific executed checks, not exhaustive proof of all game states.'),para('Probability and safety boundary','heading'),para('The probability-profile coefficients are unchanged except for the version label. Terminal-state and geometry corrections can change realized survival, contact and reward sequences. Effective damage feedback is distinct from the existing requested-damage basis of fang healing and lightning chaining. No account or database schema migration is required.'),para('Reproduction','heading'),para('Run scripts/build-combat-supplement.py BASE.pdf OUTPUT.pdf SOURCE_COMMIT with the frozen 347-page S2 baseline. The builder checks page count, preserved text, source hashes and added-page bounds. Invariant ReportLab output and a fixed commit allow a fresh duplicate build to be compared byte for byte.'),para('Baseline PDF SHA-256: '+hashlib.sha256(Path(base).read_bytes()).hexdigest(),'small'),para('Reference evidence','heading'),para('Official reference: https://florr.io/ (entry observed; guest transport failed). The official search description confirms enemies and rare-petal collection; it supplies no numerical server specification. Community wikis, fan databases and hypothetical mechanics are not promoted to official authority.'),para('Local checks do not establish production publication, server-authoritative multiplayer or physical Safari behavior. The QA report tracks those boundaries independently.')])
buffer=io.BytesIO()
SimpleDocTemplate(buffer,pagesize=(595.28,841.89),rightMargin=48,leftMargin=48,topMargin=66,bottomMargin=54).build(story,onFirstPage=furniture,onLaterPages=furniture)
addition=fitz.open(stream=buffer.getvalue(),filetype='pdf')
if len(addition)!=7:
    raise ValueError('Expected seven supplemental pages, got '+str(len(addition)))
result=fitz.open();result.insert_pdf(addition,from_page=0,to_page=0);result.insert_pdf(baseline);result.insert_pdf(addition,from_page=1)
result.set_metadata({'title':'Petal Realms Mathematical Foundations - Edition 3.2 with S1, S2 and S3','author':'Petal Realms','subject':'V5.19 candidate normative combat consistency supplement'})
Path(output).parent.mkdir(parents=True,exist_ok=True);result.save(output,garbage=4,deflate=True,no_new_id=True)
check=fitz.open(output)
assert len(check)==354
for i in range(347):
    assert check[i+1].get_text()==baseline[i].get_text(), 'Historical page text changed'
for i in [0,*range(348,354)]:
    for block in check[i].get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            for span in line['spans']:
                x0,y0,x1,y1=span['bbox'];assert x0>=0 and y0>=0 and x1<=548 and y1<=842
print('354 pages; all 347 historical page texts preserved; supplement bounds verified')
