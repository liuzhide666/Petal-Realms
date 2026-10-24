"""Append the V5.17 normative UI supplement to the frozen Edition 3.2 PDF.

Requires the existing primary-runtime ReportLab and PyMuPDF installations.
Usage: python build-interface-supplement.py BASE.pdf OUTPUT.pdf SOURCE_COMMIT
The original 333 pages remain unchanged in text and pagination.
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
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

rl_config.invariant = 1
root = Path(__file__).resolve().parents[1]
field = '--field' in sys.argv
base, output, commit = [a for a in sys.argv[1:] if a != '--field']
base_count = 340 if field else 333
version = 'V5.18' if field else 'V5.17'
supplement = 'S2' if field else 'S1'
date = '22 October 2026' if field else '21 October 2026'
if not re.fullmatch(r'[0-9a-f]{40}', commit):
    raise ValueError('Expected a full source commit SHA')
baseline = fitz.open(base)
if len(baseline) != base_count or 'Edition 3.2' not in baseline[0].get_text():
    raise ValueError('Expected the frozen '+str(base_count)+'-page baseline')
for face, file in [('Body', 'DejaVuSans.ttf'), ('Bold', 'DejaVuSans-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(face, '/usr/share/fonts/truetype/dejavu/' + file))
styles = {
    'body': ParagraphStyle('Body', fontName='Body', fontSize=10, leading=16, textColor=colors.HexColor('#233d35'), spaceAfter=12),
    'title': ParagraphStyle('Title', fontName='Bold', fontSize=24, leading=30, textColor=colors.HexColor('#193e30'), spaceAfter=22),
    'heading': ParagraphStyle('Heading', fontName='Bold', fontSize=13, leading=19, textColor=colors.HexColor('#4a6548'), spaceBefore=12, spaceAfter=10),
    'path': ParagraphStyle('Path', fontName='Bold', fontSize=9, leading=14, textColor=colors.HexColor('#4a6548'), spaceBefore=9, spaceAfter=5),
    'small': ParagraphStyle('Small', fontName='Body', fontSize=8, leading=12, textColor=colors.HexColor('#426150'), spaceAfter=9, splitLongWords=True),
}
def para(text, kind='body'):
    return Paragraph(escape(text.replace('`', '')), styles[kind])
def page(canvas, doc):
    canvas.setStrokeColor(colors.HexColor('#b2bd9d'));canvas.line(48, 796, 547, 796)
    canvas.setFont('Body', 8);canvas.setFillColor(colors.HexColor('#4a6548'))
    canvas.drawString(48, 811, 'PETAL REALMS / PR-STD-003 / EDITION 3.2 + '+('S1 + S2' if field else 'S1'))
    canvas.drawString(48, 30, ('Orbital field' if field else 'Interface continuity')+' | '+version+' | '+date)
    canvas.drawRightString(547, 30, supplement+'-' + str(doc.page))
sections = {}
source = (root / ('docs/standard/V5.18_ORBITAL_FIELD.md' if field else 'docs/standard/V5.17_INTERFACE_CONTINUITY.md')).read_text()
for block in re.split(r'^## ', source, flags=re.M)[1:]:
    title, body = block.split('\n', 1);sections[title] = body.strip()
groups = [
    ['Scope and authority', 'S1-01: Session-scoped presentation state', 'S1-02: Panel position ownership'],
    ['S1-03: Semantic focus identity', 'S1-04: Persistent equipment action'],
    ['S1-05: Scroll and drag partition', 'S1-06: Drag lifetime and isolation'],
    ['Probability and persistence boundary', 'Verification and limits'],
]
if field:
    groups=[['Scope and reference evidence','S2-01: Bounded presentation profile'],['S2-02: Rendering-state separation','S2-03: Shared original artwork and scale'],['S2-04: Clock and motion policy','S2-05: HUD and backup-deck access'],['S2-06: Optional guides and gameplay invariants','Verification and limitations']]
story = [Spacer(1, 42), para('Probability-Weighted Mechanics and Computation', 'title'), para('Edition 3.2 with normative Supplement S1', 'heading'), para('V5.17 / Interface continuity / 21 October 2026', 'heading'), para('This consolidated manual contains the original 333-page V5.16 standard and a source-pinned supplement for V5.17. The original 138 mechanism contracts remain registered. The supplement updates input, focus, scrolling, equipment access and session presentation rules. It adds no new combat or reward distribution.'), para('Reading order', 'heading'), para('The next 333 pages retain their original printed page numbers. The supplement follows them, with separate S1 page numbers. The original source census remains explicitly tied to V5.16; it must not be interpreted as a V5.17 syntax inventory.'), para('Deterministic interface transitions are probability-one cases of the state kernel. Preference weights, event probabilities and utility remain distinct.'), para('Frozen V5.17 runtime source: ' + commit, 'small'), PageBreak()]
if field:
    story=[Spacer(1,42),para('Probability-Weighted Mechanics and Computation','title'),para('Edition 3.2 with normative Supplements S1 and S2','heading'),para(version+' / Original orbital field / '+date,'heading'),para('This consolidated manual preserves the preceding 340 pages and appends the V5.18 presentation specification. The 138 registered mechanisms retain their status. Original outline artwork, bounded display settings and HUD changes do not introduce a new combat or reward probability law.'),para('Reference boundary','heading'),para('The official Florr guest entry and animated background were observed in the browser. A playable session could not be established after one recovery attempt. This release therefore makes no claim of complete playtesting, one-to-one gameplay parity or verified Florr server formulas.'),para('Reading order','heading'),para('The next 340 pages retain their original text and pagination, including earlier covers and the frozen source census. S2 follows them with separate page numbers. Earlier source inventories are not a V5.18 syntax census.'),para('Frozen V5.18 runtime source: '+commit,'small'),PageBreak()]
for group in groups:
    story.append(para('Normative '+('presentation' if field else 'interface')+' supplement', 'title'))
    for key in group:
        story.append(para(key, 'heading'))
        for p in sections[key].split('\n\n'):
            story.append(para(p))
    story.append(PageBreak())
story += [para('Source identity and change boundary', 'title'), para('Runtime source commit: ' + commit, 'small')]
scope = ['site/index.html', 'site/rules.js', 'site/release.json', 'functions/api/[[path]].js', 'docs/standard/ruleset.json', 'docs/standard/mechanisms.json', 'docs/standard/V5.17_INTERFACE_CONTINUITY.md', 'tests/browser_v517.mjs']
if field:
    scope=['site/index.html','site/art.js','site/rules.js','site/release.json','functions/api/[[path]].js','docs/standard/ruleset.json','docs/standard/mechanisms.json','docs/standard/V5.18_ORBITAL_FIELD.md','tests/browser_v518.mjs']
for name in scope:
    story += [para(name, 'path'), para('SHA-256 ' + hashlib.sha256((root/name).read_bytes()).hexdigest(), 'small')]
story += [PageBreak(), para('Conformance and limits', 'title'), para('The current browser regression contains 128 assertions across five viewport sizes. The preceding V5.16 suite contains 245 assertions. Source, test result and deployment verification are separate evidence dimensions; this document does not turn an unexecuted check into a pass.'), para('Equipment safety', 'heading'), para('For distinct item keys, reject a swap if the replaced item cannot return to its existing bag stack. The rejection occurs before consuming the requested item. Same-key swaps at the 99999 cap have zero net stock change. Neither operation bypasses existing reload, HP or save behavior.'), para('Compatibility', 'heading'), para('The native account database and save schema 5 remain compatible. Only the API health version label changes. The probability profile coefficients are unchanged; its version label follows the release. No production player account is created by the isolated browser suite.'), para('Reproduction', 'heading'), para('Run scripts/build-interface-supplement.py with the frozen Edition 3.2 baseline PDF, an output path and the exact V5.17 source commit. The source script checks the baseline page count and verifies that every original page retains its text in the consolidated output. ReportLab invariant mode removes timestamp variability from newly generated pages.'), para('Baseline PDF SHA-256: ' + hashlib.sha256(Path(base).read_bytes()).hexdigest(), 'small'), para('Hardware boundary', 'heading'), para('Chromium mobile emulation and injected browser touch events do not certify physical iPhone, iPad or Safari behavior. Successful public byte and health checks establish publication of matching files, not a complete live-account playthrough.')]
if field:
    # Replace the final S1-specific conformance page while preserving the shared source ledger.
    last = next(i for i in range(len(story)-1,-1,-1) if isinstance(story[i],PageBreak))
    story=story[:last+1]+[para('Conformance and limits','title'),para('The V5.18 browser suite exercises five viewport sizes, all 29 petal thumbnails, 43 creature portraits and 129 species-size collider cases. It verifies settings, backup-slot routing, world-pixel isolation and gameplay-state/RNG invariance. The earlier V5.16 and V5.17 suites remain mandatory release regressions.'),para('Unchanged probability coefficients','heading'),para('The canonical ruleset version label follows V5.18. All numerical probability-profile coefficients are unchanged. Collision radii, hit resolution, crafting, loot and native save schema 5 are retained. Reduced decorative motion is separate from combat simulation and danger timing.'),para('Reproduction','heading'),para('Run scripts/build-interface-supplement.py BASE.pdf OUTPUT.pdf SOURCE_COMMIT --field using the preserved 340-page S1 baseline. The builder verifies every preserved page text. ReportLab invariant mode and a fixed source commit allow a fresh duplicate build to be compared byte for byte.'),para('Baseline PDF SHA-256: '+hashlib.sha256(Path(base).read_bytes()).hexdigest(),'small'),para('Evidence boundary','heading'),para('Local and CI results, Cloudflare publication and public health are separately verified. An uploaded PDF is not evidence that the game is deployed. Emulated Chromium is not physical Safari testing. Florr combat, maps, enemy algorithms and crafting odds remain unverified because the guest world connection did not succeed.')]
buffer = io.BytesIO()
SimpleDocTemplate(buffer, pagesize=(595.28,841.89), rightMargin=48,leftMargin=48,topMargin=66,bottomMargin=54).build(story,onFirstPage=page,onLaterPages=page)
addition = fitz.open(stream=buffer.getvalue(),filetype='pdf')
if len(addition) != 7:
    raise ValueError('Supplement layout drift: expected seven new pages, got '+str(len(addition)))
result = fitz.open();result.insert_pdf(addition,from_page=0,to_page=0);result.insert_pdf(baseline);result.insert_pdf(addition,from_page=1)
result.set_metadata({'title':'Petal Realms Mathematical Foundations - Edition 3.2 with '+('S1 and S2' if field else 'S1'), 'author':'Petal Realms', 'subject':'V5.16 standard and V5.17 normative interface supplement'})
Path(output).parent.mkdir(parents=True,exist_ok=True);result.save(output,garbage=4,deflate=True,no_new_id=True)
check=fitz.open(output)
assert len(check)==base_count+7
for i in range(base_count):
    assert check[i+1].get_text()==baseline[i].get_text(), 'Baseline text changed at page '+str(i+1)
for i in [0,*range(base_count+1,base_count+7)]:
    for block in check[i].get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            for span in line['spans']:
                x0,y0,x1,y1=span['bbox'];assert x0>=0 and y0>=0 and x1<=548 and y1<=842
print(str(len(check))+' pages; original '+str(base_count)+' page texts preserved; supplement bounds verified')
