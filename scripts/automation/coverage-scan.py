import json

data = json.load(open('coverage/coverage-summary.json', encoding='utf-8'))
rows = []
for f, v in data.items():
    if f == 'total':
        continue
    short = f.replace('D:\\projects\\cafeduo\\', '').replace('D:/projects/cafeduo/', '')
    rows.append((v['lines']['pct'], v['functions']['pct'], v['branches']['pct'], short))
rows.sort()
print('=== EN ZAYIF 12 DOSYA (line %) ===')
for l, fn, b, f in rows[:12]:
    print(f'{l:6.1f}% line | {fn:6.1f}% fn | {b:6.1f}% br | {f}')

# Kac dosya %80 altinda
below80 = [r for r in rows if r[0] < 80]
print(f'\n=== %80 altinda {len(below80)}/{len(rows)} dosya ===')
