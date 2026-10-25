"""Inline the real local assets for isolated set_content/synthetic-origin fixtures."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'site'

def inline_assets(source):
    source = re.sub(
        r'<script src="([a-z][a-z0-9-]*\.js)(?:\?[^\"]*)?"></script>',
        lambda match: '<script>' + (ROOT / match.group(1)).read_text() + '</script>', source)
    return re.sub(
        r'<link rel="stylesheet" href="([a-z][a-z0-9-]*\.css)(?:\?[^\"]*)?">',
        lambda match: '<style>' + (ROOT / match.group(1)).read_text() + '</style>', source)
