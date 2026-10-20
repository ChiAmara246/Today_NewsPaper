import json,sys,random
idx=sys.argv[1]; cat=sys.argv[2]; files=sys.argv[3:]
d=json.load(open(idx,encoding='utf-8'))
heads={a['headline'].lower() for a in d}
nid=max(a['id'] for a in d)+1; added=0
for f in files:
    for a in json.load(open(f,encoding='utf-8')):
        if a['headline'].lower() in heads: print("doublon:",a['headline']); continue
        d.append({"id":nid,"category":cat,"headline":a["headline"],"summary":a["summary"],"fullStory":a["fullStory"],
                  "img":"","date":a["date"],"author":"","source":a.get("source",""),"view":random.randint(7221,16387)})
        nid+=1; added+=1
open(idx,'w',encoding='utf-8').write(json.dumps(d,indent=2,ensure_ascii=False))
print("ajoutés:",added,"dernier id:",nid-1)
