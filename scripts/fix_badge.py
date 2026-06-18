#!/usr/bin/env python3
# Fix the 2 remaining âœ" (with ASCII double-quote) badges in dashboard
import re

path = r'C:/Users/milan/Documents/exp-sui-walrus/web/dashboard/index.html'

corrupt_char = chr(0x00e2) + chr(0x0153) + chr(0x0022)  # â + œ + ASCII "
correct_char = '✓'  # ✓

with open(path, 'r', encoding='utf-8', newline='') as f:
    content = f.read()

count = content.count(corrupt_char)
print('Found', count, 'occurrences of the corrupted pattern')
content = content.replace(corrupt_char, correct_char)

with open(path, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print('Done.')
