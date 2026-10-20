"""Give an image to every article without a valid one, by theme.
Usage: python3 imgs_all.py index.json [apply]"""
import json, re, sys, collections

idx = sys.argv[1]; apply = len(sys.argv) > 2
d = json.load(open(idx, encoding='utf-8'))
valid = lambda s: bool(re.search(r'\.(jpe?g|png|gif|webp|svg)$', str(s).strip(), re.I))

S = lambda *n: ['stock/' + x for x in n]
POLICE = S('police-2.jpg', 'police-3.jpg')
COURT = S('court-1.jpg', 'court-2.jpg', 'court-3.jpg')
MILITARY = S('military-1.jpg', 'military-2.jpg', 'military-3.jpg') + ['millitry.jpeg']
TINUBU = ['TINUBU-MEETS-GOVERNORS.jpeg', 'Tinubu&security+villa.jpeg', 'President-Tinubu+security-officials.jpeg']
EDU = ['Nigerian-pupils-classroom.jpeg', 'Nigerian-pupils-public-school-classroom.jpeg', 'Nigerian-secondary-school-students.jpeg',
       'Lagos-school-pupils.jpeg', 'Oyo-State-pupils.jpeg', 'Teachers-education-officials.jpeg', 'university-of-abuja-campus.jpeg']

COMMON = [
    (r'court|judge|tribunal|trial|arraign|lawsuit|\bsues?\b|verdict|judgement|judgment', COURT),
    (r'police|arrest|suspect|robber|kidnap|abduct|\bcult|crime|criminal', POLICE),
    (r'army|military|troops|soldier|insurgen|bandit|terror|boko', MILITARY),
    (r'hospital|health|disease|cholera|diphtheria|lassa|patients|doctors?|nurses?|clinic', S('hospital-2.jpg')),
    (r'flood|erosion|heavy rain|rainstorm', S('flood-2.jpg')),
    (r'\bfire\b|blaze|inferno|explosion|burnt|razed', S('fire-1.jpg', 'fire-2.jpg', 'fire-3.jpg')),
    (r'road|accident|crash|traffic|commuter|transport|bus\b|vehicle', S('traffic-1.jpg')),
]
RULES = {
    'Economy': [
        (r'fuel|petrol|\bpms\b|subsidy|filling station|pump price', S('fuel-1.jpg', 'fuel-2.jpg', 'fuel-3.jpg')),
        (r'crude|\boil\b|nnpc|refiner|upstream|barrel|\bgas\b', ['NNPC+crude+oil.jpeg', 'Nigerian-oil-workers-monitoring-crude-production-equipment.png', 'dangote-complex.jpeg']),
        (r'\bcbn\b|central bank|monetary|interest rate|\bbank', S('bank-1.jpg') + ['central-bank-nigeria.jpeg']),
        (r'naira|exchange rate|forex|currency|inflation|debt|revenue|budget|tax', S('naira-1.jpg') + ['money-exchange.jpeg']),
        (r'farm|agric|crop|harvest|fertili|food|rice|maize|livestock', S('farm-1.jpg', 'farm-3.jpg')),
        (r'factory|manufactur|industr|\bsme', ['nigerian_factory.jpeg']),
        (r'solar|power|electricity|energy|grid', ['solar+people.jpeg']),
        (r'market|trader|prices|consumer|traders', S('market-1.jpg') + ['market.jpg', 'ilorin_market.jpeg']),
    ],
    'Entertainment': [
        (r'film|movie|nollywood|cinema|actor|actress|series|screening|box office', S('cinema-1.jpg', 'cinema-2.jpg', 'cinema-3.jpg')),
        (r'festival|culture|cultural|heritage|durbar|carnival|tradition|fashion|style', S('festival-1.jpg')),
        (r'music|concert|album|song|singer|afrobeat|artist|\bdj\b|performance', S('concert-1.jpg', 'music-studio-1.jpg', 'music-studio-3.jpg')),
    ],
}
DEFAULT = {
    'Economy': S('market-1.jpg', 'naira-1.jpg', 'bank-1.jpg') + ['market.jpg'],
    'Entertainment': S('cinema-1.jpg', 'concert-1.jpg', 'music-studio-1.jpg', 'festival-1.jpg', 'cinema-2.jpg'),
    'Trending': S('market-1.jpg', 'festival-1.jpg') + ['market.jpg', 'ilorin_market.jpeg'],
    'Education': EDU,
}

stats = collections.Counter()
for a in d:
    if valid(a.get('img')):
        continue
    text = (a.get('headline', '') + ' ' + a.get('summary', '')).lower()
    cat = a.get('category', '')
    choices = None
    for pat, imgs in RULES.get(cat, []) + COMMON:
        if re.search(pat, text):
            choices = imgs; break
    if not choices and cat == 'Politics':
        # President's photos only for stories about him or the federal government, after 29 May 2023
        if a.get('date', '') >= '2023-05-29' and re.search(r'tinubu|president|presidency|villa|federal government|\bfg\b', text):
            choices = TINUBU
    if not choices:
        choices = DEFAULT.get(cat)
    if not choices:
        stats['laissé sans image'] += 1; continue
    img = choices[int(a['id']) % len(choices)]
    stats[cat] += 1
    if apply:
        a['img'] = img

print(dict(stats))
if apply:
    open(idx, 'w', encoding='utf-8').write(json.dumps(d, indent=2, ensure_ascii=False))
    print('ENREGISTRÉ')
