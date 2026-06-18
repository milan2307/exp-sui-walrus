#!/usr/bin/env python3
"""
Fix UTF-8 double-encoding corruption in all HTML files.

Root cause: UTF-8 bytes mis-read as Windows-1252, re-encoded as UTF-8.
Each corrupted sequence is computed by decoding the original UTF-8 bytes
through cp1252, so invisible C1 control chars are included precisely.
"""
import os
import glob

# cp1252 leaves 0x81,0x8D,0x8F,0x90,0x9D undefined; browsers/tools map them to C1 controls.
_C1_MAP = {0x81: '', 0x8d: '', 0x8f: '', 0x90: '', 0x9d: ''}

def as_corrupt(utf8_bytes):
    """Decode UTF-8 byte sequence as Windows-1252 -> get the corrupted Unicode string.
    Undefined W1252 bytes (0x81,0x8D,0x8F,0x90,0x9D) map to C1 control chars
    (confirmed by byte inspection of the actual files)."""
    result = []
    for b in utf8_bytes:
        if b in _C1_MAP:
            result.append(_C1_MAP[b])
        else:
            result.append(bytes([b]).decode('cp1252'))
    return ''.join(result)

# Variation selector U+FE0F: EF B8 8F
VS16_CORRUPT = as_corrupt([0xef, 0xb8, 0x8f])
VS16_CORRECT  = '️'  # U+FE0F

# Table: (correct_char, utf8_bytes)
# Longer corrupt patterns (with VS) are added first by sorting below.
EMOJI_TABLE = [
    # ---- 4-byte emoji (F0 9F ...) ----
    ('📦', [0xf0,0x9f,0x93,0xa6]),
    ('📈', [0xf0,0x9f,0x93,0x88]),
    ('📉', [0xf0,0x9f,0x93,0x89]),
    ('📋', [0xf0,0x9f,0x93,0x8b]),
    ('📄', [0xf0,0x9f,0x93,0x84]),
    ('📂', [0xf0,0x9f,0x93,0x82]),
    ('📊', [0xf0,0x9f,0x93,0x8a]),
    ('📡', [0xf0,0x9f,0x93,0xa1]),
    ('📝', [0xf0,0x9f,0x93,0x9d]),
    ('📮', [0xf0,0x9f,0x93,0xae]),
    ('🔐', [0xf0,0x9f,0x94,0x90]),
    ('🔏', [0xf0,0x9f,0x94,0x8f]),
    ('🔍', [0xf0,0x9f,0x94,0x8d]),
    ('🔎', [0xf0,0x9f,0x94,0x8e]),
    ('🔑', [0xf0,0x9f,0x94,0x91]),
    ('🔒', [0xf0,0x9f,0x94,0x92]),
    ('🔓', [0xf0,0x9f,0x94,0x93]),
    ('🔔', [0xf0,0x9f,0x94,0x94]),
    ('🔗', [0xf0,0x9f,0x94,0x97]),
    ('🔧', [0xf0,0x9f,0x94,0xa7]),
    ('🔨', [0xf0,0x9f,0x94,0xa8]),
    ('🏛', [0xf0,0x9f,0x8f,0x9b]),
    ('🏢', [0xf0,0x9f,0x8f,0xa2]),
    ('🏦', [0xf0,0x9f,0x8f,0xa6]),
    ('🌍', [0xf0,0x9f,0x8c,0x8d]),
    ('🌎', [0xf0,0x9f,0x8c,0x8e]),
    ('🌏', [0xf0,0x9f,0x8c,0x8f]),
    ('🌊', [0xf0,0x9f,0x8c,0x8a]),
    ('🚢', [0xf0,0x9f,0x9a,0xa2]),
    ('🚀', [0xf0,0x9f,0x9a,0x80]),
    ('🛡', [0xf0,0x9f,0x9b,0xa1]),
    ('🗳', [0xf0,0x9f,0x97,0xb3]),
    ('🪪', [0xf0,0x9f,0xaa,0xaa]),
    ('💰', [0xf0,0x9f,0x92,0xb0]),
    ('💸', [0xf0,0x9f,0x92,0xb8]),
    ('💡', [0xf0,0x9f,0x92,0xa1]),
    # ---- 3-byte emoji / special chars ----
    ('✅', [0xe2,0x9c,0x85]),
    ('❌', [0xe2,0x9d,0x8c]),
    ('⚠', [0xe2,0x9a,0xa0]),
    ('✈', [0xe2,0x9c,0x88]),
    ('⚙', [0xe2,0x9a,0x99]),
]

pairs = []
for correct, utf8 in EMOJI_TABLE:
    c = as_corrupt(utf8)
    # VS variant first (longer pattern takes priority)
    pairs.append((c + VS16_CORRUPT, correct + VS16_CORRECT))
    pairs.append((c, correct))

# Sort longest corrupt pattern first to prevent partial matches
pairs.sort(key=lambda x: -len(x[0]))

# Catch any remaining orphan variation selectors
pairs.append((VS16_CORRUPT, VS16_CORRECT))

# Typography (ordered: longest / most specific first)
TYPOGRAPHY = [
    # em dash U+2014: E2 80 94
    (as_corrupt([0xe2,0x80,0x94]), '—'),
    # en dash U+2013: E2 80 93
    (as_corrupt([0xe2,0x80,0x93]), '–'),
    # ellipsis U+2026: E2 80 A6
    (as_corrupt([0xe2,0x80,0xa6]), '…'),
    # right single quote U+2019: E2 80 99
    (as_corrupt([0xe2,0x80,0x99]), '’'),
    # left single quote U+2018: E2 80 98
    (as_corrupt([0xe2,0x80,0x98]), '‘'),
    # left double quote U+201C: E2 80 9C
    (as_corrupt([0xe2,0x80,0x9c]), '“'),
    # right double quote U+201D: E2 80 9D
    (as_corrupt([0xe2,0x80,0x9d]), '”'),
    # bullet U+2022: E2 80 A2
    (as_corrupt([0xe2,0x80,0xa2]), '•'),
    # low double quote U+201E: E2 80 9E
    (as_corrupt([0xe2,0x80,0x9e]), '„'),
    # middle dot U+00B7: C2 B7
    (as_corrupt([0xc2,0xb7]), '·'),
    # copyright C2 A9
    (as_corrupt([0xc2,0xa9]), '©'),
    # registered C2 AE
    (as_corrupt([0xc2,0xae]), '®'),
    # degree C2 B0
    (as_corrupt([0xc2,0xb0]), '°'),
    # non-breaking space C2 A0
    (as_corrupt([0xc2,0xa0]), ' '),
    # plus-minus C2 B1
    (as_corrupt([0xc2,0xb1]), '±'),
]
pairs.extend(TYPOGRAPHY)


def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8', newline='') as f:
        content = f.read()
    original = content
    for corrupt_str, correct_str in pairs:
        if corrupt_str in content:
            content = content.replace(corrupt_str, correct_str)
    if content != original:
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            f.write(content)
        return True
    return False


web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')
html_files = sorted(glob.glob(web_dir + '/**/*.html', recursive=True))

fixed = 0
for filepath in html_files:
    changed = fix_file(filepath)
    rel = os.path.relpath(filepath, web_dir)
    print(f"{'FIXED' if changed else 'clean'}: {rel}")
    if changed:
        fixed += 1

print(f'\n{fixed}/{len(html_files)} files updated.')
