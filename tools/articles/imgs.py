import json,re,sys
idx=sys.argv[1]; apply=len(sys.argv)>2
d=json.load(open(idx,encoding='utf-8'))
rules=[
 # (catégories, motif, image)
 (None,r"abduct|kidnap|captiv|insurgen|\bcult|gunshot","millitry.jpeg"),
 ("Education",r"\bUBEC\b","ubec-logo.jpeg"),
 ("Education",r"robot|\bAI\b|digital|computer|trading room|financial markets","Nigerian-students-using-computers.jpeg"),
 ("Education",r"technical|TVET|vocational|skills|NBTE|agricultural education|practical","Nigerian-technical-education.jpeg"),
 ("Education",r"WAEC|WASSCE|NECO|JAMB|UTME|malpractice|spelling|essay","Nigerian-secondary-school-students.jpeg"),
 ("Education",r"ASUU|strike|lecturers|NUT\b|teachers|salary","Teachers-education-officials.jpeg"),
 ("Education",r"graduat|graduands|reward|prize|wins|scholarship|Enactus|Model United","schoolcelebration.jpg"),
 ("Education",r"Lagos|King's College|Queen's College","Lagos-school-pupils.jpeg"),
 ("Education",r"out of school|children|pupils|birth certificate|Almajiri|Tsangaya|grandmother","Nigerian-pupils-public-school-classroom.jpeg"),
 ("Education",r"research|professor|inaugural|biomedical|climate|indigenous","Nigerian-university-researchers.jpeg"),
 ("Education",r"FG\b|FEC|NELFUND|Alausa|Safe Schools|minister","Federal-education-officials-conducting.jpeg"),
 ("Education",r"universit|varsity|campus|polytechnic|registrar|rector|TETFund|YABATECH|UDUS|NUC\b|UNILAG|UNIMED|UNICAL|ABU\b|KASU|ESUT|Law School|hostel|BUK","university-of-abuja-campus.jpeg"),
 ("Education",r"experts|stakeholders|campaign|NGO|group","Education-stakeholders.jpeg"),
 ("Education",r".","Nigerian-pupils-classroom.jpeg"),
 ("Politics",r"INEC|campaign council|Tinubu","TINUBU-MEETS-GOVERNORS.jpeg"),
 ("Politics",r"insecurity|killings","President-Tinubu+security-officials.jpeg"),
 ("Economy",r"debt","central-bank-nigeria.jpeg"),
 ("Economy",r"oil|Renaissance","Nigerian-oil-workers-monitoring-crude-production-equipment.png"),
 ("Economy",r"FAAC|revenue","money-exchange.jpeg"),
 ("Economy",r"inflation|food prices","market.jpg"),
 ("Announces",r"NASENI|innovat","Nigerian-university-researchers.jpeg"),
]
for a in d:
    if a['id']<6260 or a['img']: continue
    t=a['headline']
    for cat,pat,img in rules:
        if (cat is None or cat==a['category']) and re.search(pat,t,re.I):
            a['img']=img; break
    print(a['id'],a['category'][:4],(a['img'] or '-')[:28].ljust(28),t[:70])
if apply: open(idx,'w',encoding='utf-8').write(json.dumps(d,indent=2,ensure_ascii=False)); print("ENREGISTRÉ")
