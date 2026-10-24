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
 ("Economy",r"court|sues|suit|receiver|judgment|tribunal","stock/court-1.jpg"),
 ("Economy",r"petrol|fuel|pump|PMS|diesel|subsid|marketers|filling station|cooking gas|LPG|CNG","stock/fuel-1.jpg"),
 ("Economy",r"Dangote|refiner","dangote-complex.jpeg"),
 ("Economy",r"NNPC|crude|oil|gas|barrel|bpd|NUPRC|OPEC|FPSO|offshore|Seplat|Aradel|Shell|Oando|flar|NLNG|Bonga","NNPC+crude+oil.jpeg"),
 ("Economy",r"power|electric|grid|DisCo|GenCo|Genco|TCN|NERC|meter|tariff|transmission|mini-grid|solar|MW\b|substation|tower","solar+people.jpeg"),
 ("Economy",r"\bCBN\b|Cardoso|interest rate|MPR|reserve|monetary|OMO|treasury bill|T-bill|liquidity","central-bank-nigeria.jpeg"),
 ("Economy",r"naira|FX|forex|exchange rate|remittance|dollar|Eurobond","stock/naira-1.jpg"),
 ("Economy",r"bank|lend|credit|loan|deposit|NDIC|fintech|OPay|PalmPay|payment|NIBSS","stock/bank-1.jpg"),
 ("Economy",r"stock|NGX|shares|IPO|market cap|equit|investors|listing|bond|dividend","money-exchange.jpeg"),
 ("Economy",r"food|farm|agric|cocoa|wheat|sugar|cassava|fish|livestock|rice|cement","stock/farm-1.jpg"),
 ("Economy",r"inflation|prices|cost of living|market","stock/market-1.jpg"),
 ("Economy",r"manufactur|factory|industr|textile|brewer","nigerian_factory.jpeg"),
 ("Economy",r"port|customs|smuggl|cargo|export|import|trade|AfCFTA|AGOA|China","African-trade-officials-business-representatives.jpeg"),
 ("Economy",r"airline|airport|aviation|flight|FAAN|NCAA|aircraft|Air Peace|taxi|Uber|Bolt|train|rail","stock/traffic-1.jpg"),
 ("Economy",r"ECOWAS|IMF|World Bank|AfDB|Afreximbank|Africa","ecowas+officials.jpeg"),
 ("Economy",r"Tinubu|governors|FEC|Shettima","TINUBU-MEETS-GOVERNORS.jpeg"),
 ("Economy",r"debt","central-bank-nigeria.jpeg"),
 ("Economy",r"oil|Renaissance","Nigerian-oil-workers-monitoring-crude-production-equipment.png"),
 ("Economy",r"FAAC|revenue","money-exchange.jpeg"),
 ("Economy",r"inflation|food prices","market.jpg"),
 ("Economy",r".","money-exchange.jpeg"),
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
