"""Builds the Stockport page and three national articles from the terms-coaching shell.
Usage: python3 -I build_seo_pages.py <repo dir>"""
import html, json, pathlib, re, sys

ROOT = pathlib.Path(sys.argv[1])
SITE = "https://callumbcoaching.co.uk"
shell = (ROOT / "terms-coaching.html").read_text()
head_end = shell.index("<main>")
foot_start = shell.index("</main>")
TODAY = "2026-10-25"

SRC = {
    "lichtman": ("Lichtman et al., NEJM 1992", "https://doi.org/10.1056/NEJM199212313272701"),
    "harvey": ("Harvey et al., Obesity 2019", "https://doi.org/10.1002/oby.22382"),
    "burke": ("Burke et al., J Am Diet Assoc 2011", "https://doi.org/10.1016/j.jada.2010.10.008"),
    "anderson": ("Anderson et al., Am J Clin Nutr 2001", "https://doi.org/10.1093/ajcn/74.5.579"),
    "thorogood": ("Thorogood et al., Am J Med 2011", "https://doi.org/10.1016/j.amjmed.2011.02.037"),
    "johns": ("Johns et al., J Acad Nutr Diet 2014", "https://doi.org/10.1016/j.jand.2014.07.005"),
    "trainera": ("Trainera, Personal Trainer Cost UK, Oct 2026", "https://trainera.fit/blogs/personal-trainer-cost-uk"),
    "gymguide": ("GymGuide, Personal Trainer Cost UK 2026", "https://gymguide.co.uk/personal-trainer-cost-uk-2026-guide/"),
    "bark": ("Bark, Personal Trainers in Stockport", "https://www.bark.com/en/gb/personal-trainer/greater-manchester/stockport/"),
}

def cite(key):
    name, url = SRC[key]
    return f'<a href="{url}" target="_blank" rel="noopener">{name}</a>'

def table(head, rows, cls=""):
    th = "".join(f"<th>{h}</th>" for h in head)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="tt {cls}"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'

def ul(items):
    return '<ul class="tl2">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"

def p(text):
    return f'<p class="body">{text}</p>'

def note(text):
    return f'<p class="tnote">{text}</p>'

PROOF = ul([
    '<b>Mark, 44, tiler and dad.</b> Waist down 28cm in nine weeks, 119cm to 91cm, measured by him at the navel every week. Chest up 6cm.',
    '<b>Dale.</b> Blood pressure 180/126 in hospital, 114/74 ten weeks in, and 8.7kg down. His own readings, from his own post. Medication decisions stayed with his GP.',
    '<b>Jonny.</b> Over ten years of trying on his own. Eight weeks in: "I\'m feeling and looking the best I ever have."',
    '<b>Me.</b> Stage 2 hypertension, 151/105 in January 2023, to 113/69 in March 2024 on the same monitor, with no medication.',
])

KEEP_READING = [
    ("/online-personal-trainer-cost", "What an online personal trainer costs in the UK"),
    ("/is-online-personal-training-worth-it", "Is online personal training worth it?"),
    ("/online-vs-in-person-personal-trainer", "Online or in-person personal trainer?"),
    ("/online-personal-trainer-stockport", "Online personal trainer in Stockport"),
]

PAGES = [
    dict(
        slug="online-personal-trainer-stockport",
        title="Online Personal Trainer in Stockport | CALLUM.B",
        desc="Callum is an online personal trainer based in Stockport, coaching men 30+ across Greater Manchester and the UK. Weekly check-ins, a real plan, real results.",
        eyebrow="Online personal trainer · Stockport",
        h1=("Based in Stockport.", "Coaching men everywhere."),
        lede="I'm Callum, an online personal trainer based in Stockport. I coach men in their thirties, forties and fifties, here and right across the UK, one-to-one through the app, WhatsApp and a weekly check-in that I read myself.",
        kind="local",
        sections=[
            ("Why online", "Why online, when I'm just down the road", [
                p("Most personal training in Stockport is sold by the session. Bark lists local sessions at £40 to £54, an average of £47 (" + cite("bark") + "). Three a week at that average comes to about £600 a month, and it covers three hours of your week."),
                p("The other 165 hours are where results are actually decided. What you eat on a Friday night. Whether you sleep. Whether you move on the days you don't train. Online coaching is built around that part of the week, not the hour in the gym."),
                p("So you train wherever you already train. A chain gym in town, a Life Leisure centre, a garage set-up at home. I see every session in the app, every meal you log and every number you send me, and once a week I decide the one thing to change next."),
            ]),
            ("What you get", "What coaching includes", [
                ul([
                    "<b>Calibrated macros.</b> Your real maintenance first, then protein, carbs and fats set to your goal.",
                    "<b>A structured programme.</b> Three gym sessions a week and 10,000 steps a day as the baseline, with progression built in.",
                    "<b>Weekly check-ins.</b> Food, training, steps, sleep and resting heart rate, read together. One adjustment at a time.",
                    "<b>Video feedback.</b> Film your sets and get timestamped notes back within 48 hours.",
                    "<b>WhatsApp, answered within 24 hours.</b> A direct line to me, not an assistant.",
                    "<b>Bloods read with you.</b> TRT-aware coaching. Medication decisions stay with you and your prescriber.",
                ]),
                p('The full breakdown is on the <a href="/coaching">coaching page</a>.'),
            ]),
            ("Who it's for", "Who this is for", [
                p("Men with jobs, kids and busy weeks. You've done the plans. You've restarted more than once, and you got to the end of week two again. You don't need more motivation. You need someone reading your numbers every week and telling you what to change."),
                p("It isn't for you if you want a six-week shred and then back to chaos, or if you won't track what you eat. I'd rather tell you that now."),
            ]),
            ("Proof", "Results, not promises", [
                PROOF,
                p('Every one of them was coached online. Photos, numbers and their own words are on the <a href="/results">results page</a>. Individual results: yours depend on where you start and how consistently you follow the plan.'),
            ]),
            ("The cost", "What it costs", [
                table(["Plan", "Price", "What it is"], [
                    ["12 Week Foundation", "£1,200, or 3 × £450", "1:1 coaching. Installs and proves the system."],
                    ["6 Month Transformation", "£2,200, or 6 × £405", "1:1 coaching through full phase progression."],
                    ["12 Month Structured Development", "£3,500, or 12 × £324", "1:1 coaching for the full year."],
                    ["The Ninety", "£297, one payment", "90 days, guided. Starts any time."],
                    ["Physique OS", "£29 a month", "Run the system yourself. 7 days free."],
                ], "money"),
                p('Every 1:1 plan carries the <a href="/terms-coaching">8-Week Progress Guarantee</a>. If you\'re weighing prices up, I\'ve written an honest guide to <a href="/online-personal-trainer-cost">what online personal trainers cost in the UK</a>.'),
            ]),
        ],
        faq=[
            ("Do I need to live in Stockport?", "No. I'm based in Stockport, but coaching is online, so it works the same wherever you are in the UK. Clients train in their own gym, on their own schedule."),
            ("Can I train at my own gym?", "Yes. Your programme is written for the gym you already use, whether that's a big chain, a leisure centre or kit at home. You log every session in the app and I review it."),
            ("How much does an online personal trainer cost?", "My 1:1 coaching starts at £1,200 for 12 weeks, about £100 a week, with monthly payment plans on every package. The Ninety is £297 for 90 days, and Physique OS is £29 a month."),
            ("I'm a beginner. Is this too advanced?", "Not at all. The system scales from a 3-day full-body foundation upward. Beginners often progress fastest because the structure removes the guesswork from day one."),
            ("How do I start?", "Apply. It's a short form, about two minutes, and I read every application myself. If I don't think I'm the right coach for you, I'll tell you straight."),
        ],
    ),
    dict(
        slug="online-personal-trainer-cost",
        title="Online Personal Trainer Cost UK (2026 Prices) | CALLUM.B",
        desc="What online personal trainers charge in the UK in 2026: monthly prices, what you get at each level, how it compares with a gym PT, and what to ask first.",
        eyebrow="Guide · updated October 2026",
        h1=("What an online personal trainer", "costs in the UK."),
        lede="Most UK online coaches charge somewhere between £60 and £200 a month. Premium one-to-one coaching sits above that. Here's what you get at each level, how it compares with paying a PT by the session, and what to ask before you hand over any money.",
        kind="article",
        sections=[
            ("Short answer", "The short answer", [
                p("Published UK guides put standard online coaching at roughly £60 to £200 a month (" + cite("trainera") + "; " + cite("gymguide") + "). App-only plans start lower. One-to-one coaching where the coach personally reads your data every week sits above that range. Mine works out at £67 to £113 a week, depending on the plan."),
                p("An in-person personal trainer is usually priced by the session, at about £35 to £65 in a gym (" + cite("gymguide") + "). In Stockport, where I'm based, Bark's listed average is £47 a session (" + cite("bark") + ")."),
            ]),
            ("Price levels", "What you get at each price", [
                table(["Type", "Typical UK price", "What you usually get"], [
                    ["App or template plan", "£10 to £30 a month", "A programme and tracking app. Nobody reads your data, or only loosely."],
                    ["Standard online coaching", "£60 to £200 a month", "A personalised plan, a check-in form, and messages answered when the coach can."],
                    ["1:1 coaching, like mine", "£67 to £113 a week (£292 to £450 a month)", "The coach personally reviews your food, training, steps and recovery every week, adjusts the plan, reviews your lifts on video and answers you directly."],
                    ["In-person PT, 2 sessions a week", "About £70 to £130 a week (£300 to £560 a month)", "Two supervised hours a week. Food and the rest of the week are usually on you."],
                    ["In-person PT, 3 sessions a week", "About £105 to £195 a week (£450 to £850 a month)", "Three supervised hours a week. Same again for the rest of the week."],
                ]),
                note("<b>How the in-person figures are worked out:</b> £35 to £65 a session (" + cite("gymguide") + "), two or three sessions a week, about 4.3 weeks a month."),
            ]),
            ("What drives price", "What you're actually paying for", [
                p("Two coaches can both say \"online coaching\" and mean completely different things. The price usually follows five things:"),
                ul([
                    "<b>Who reads your check-in.</b> The coach, an assistant, or nobody. Ask directly.",
                    "<b>How often the plan changes.</b> A plan that's adjusted weekly against your numbers is a different service from one rewritten every eight weeks.",
                    "<b>Nutrition.</b> A macro target built from your real maintenance, or a generic meal plan.",
                    "<b>Form feedback.</b> Whether you can send videos of your lifts and get notes back, and how fast.",
                    "<b>Response time.</b> A direct line answered within a day, or a support inbox.",
                ]),
            ]),
            ("Red flags", "Where cheap gets expensive", [
                p("The cheapest option costs the most if you quit it in week three. People under-report what they eat by 47% on average (" + cite("lichtman") + "), so a plan nobody checks tends to drift without anyone noticing. Self-monitoring is one of the most consistent predictors of weight loss across studies (" + cite("burke") + "), and the people who lose the most log their food more often (" + cite("harvey") + ")."),
                ul([
                    "The same PDF sent to everyone, with your name added.",
                    "A check-in form that never gets a written reply.",
                    "A long minimum contract with no way out.",
                    "Promises of a set number of kilos in a set number of weeks.",
                ]),
            ]),
            ("My prices", "My prices, plainly", [
                p("I cost more than most online coaching, and less than an in-person PT. I'd rather show you exactly where."),
                table(["Plan", "Paid in full", "Payment plan", "Works out at"], [
                    ["12 Week Foundation", "£1,200", "3 × £450", "£100 to £113 a week"],
                    ["6 Month Transformation", "£2,200", "6 × £405", "£85 to £94 a week"],
                    ["12 Month Structured Development", "£3,500", "12 × £324", "£67 to £75 a week"],
                ], "money"),
                p("For comparison, two sessions a week with a Stockport PT at the £47 average is about £94 a week, and that covers two hours. The 12-month plan costs less than that and covers the whole week: your food, training, steps, sleep and recovery, read by me every week."),
                p("That buys me personally, every week: every check-in, every video review, every WhatsApp answer. No assistants. Every 1:1 plan comes with the <a href=\"/terms-coaching\">8-Week Progress Guarantee</a>: hold 80% on your weekly structure score for eight weeks, and if nothing has improved, the next month is on me."),
                p('If that\'s more than you want to spend, <a href="/the-ninety/">The Ninety</a> is £297 for 90 days guided, and <a href="/start/">Physique OS</a> is £29 a month to run the same system yourself.'),
            ]),
            ("Before you pay", "Five questions to ask any coach", [
                ul([
                    "Who reads my check-in, and when will I hear back?",
                    "How do you set my calories, and how often do you change them?",
                    "Can I send you videos of my lifts?",
                    "What happens if I stop progressing?",
                    "Can I leave early, and what do I owe if I do?",
                ]),
                p("A good coach answers all five without hesitating. You'll find my answers in the <a href=\"/terms-coaching\">coaching terms</a>, in plain English."),
            ]),
        ],
        faq=[
            ("Is online personal training cheaper than a gym PT?", "Usually, yes. Standard online coaching is about £60 to £200 a month, while three in-person sessions a week costs roughly £450 to £850 a month. Online coaching also covers your food, steps and recovery, not just the hours in the gym."),
            ("Why do some online coaches charge £300 or more a month?", "Mostly because of time. It's still usually less than seeing a PT in person twice a week. At that level the coach personally reviews your data every week and adjusts your plan, gives form feedback, and answers messages directly. Cheaper plans usually mean less of that, or none."),
            ("Can I pay monthly?", "With most coaches, yes. Every one of my 1:1 packages has a monthly payment plan, spread across the whole programme rather than front-loaded."),
            ("Are there contracts?", "It varies, so ask before you pay. With me you can stop at any time. Nothing further is owed beyond instalments already due, and there's a 14-day cooling-off period."),
        ],
    ),
    dict(
        slug="is-online-personal-training-worth-it",
        title="Is Online Personal Training Worth It? | CALLUM.B",
        desc="When online personal training is worth the money and when it isn't, from a UK online coach. What the research says, who it suits, and how to tell within eight weeks.",
        eyebrow="Guide · updated October 2026",
        h1=("Is online personal training", "worth it?"),
        lede="It's worth it if you'll track honestly and a real coach reads your numbers every week. It isn't if you're after motivation, or a PDF you'll stop opening by week three. Here's how to tell which one you're buying.",
        kind="article",
        sections=[
            ("Short answer", "The honest answer", [
                p("Online coaching works when it does two things: makes you measure what you're doing, and puts someone in charge of reading those measurements and changing the plan. Take either away and you're paying for a programme you could have found for free."),
                p("That's not my opinion. Across 22 studies, self-monitoring was consistently linked to weight loss (" + cite("burke") + "). People who lost 10% or more of their weight logged food 2.7 times a day, against 1.7 for those who lost less (" + cite("harvey") + "). The tracking is the work. The coach makes sure it gets done, and gets used."),
            ]),
            ("Worth it when", "It's worth it when", [
                ul([
                    "You've started more than once and keep stalling around the same point.",
                    "You know roughly what to do, but not what to change when it stops working.",
                    "Your week is busy and unpredictable: work, kids, shifts, travel.",
                    "You'll log your food and training honestly, even on the bad days.",
                    "You want to learn to run it yourself eventually, not depend on someone forever.",
                ]),
            ]),
            ("Not worth it when", "It isn't worth it when", [
                ul([
                    "You want someone to physically stand next to you every session.",
                    "You won't track what you eat. Without the data, there's nothing to coach.",
                    "You want a six-week shred before a holiday, then back to normal.",
                    "Nobody actually reads your check-in. Then it's just an expensive app.",
                ]),
                p("If you're a complete beginner who's never been in a gym, a few in-person sessions to learn the lifts can be money well spent first. I've written about that in <a href=\"/online-vs-in-person-personal-trainer\">online versus in-person training</a>."),
            ]),
            ("Long term", "The part most plans skip", [
                p("Losing weight isn't the hard bit. Keeping it is. Five years after structured weight-loss programmes, people had kept only 17 to 29% of what they lost on average (" + cite("anderson") + "). That's why the measure of good coaching isn't the first eight weeks. It's whether you leave knowing how to run the system without the coach."),
                p("That's also why I don't sell endless cardio. Six to twelve months of cardio alone produced about 1.6kg of weight loss across 14 trials (" + cite("thorogood") + "). Food, three lifting sessions a week and daily steps do the heavy lifting."),
            ]),
            ("Proof", "What it looks like in practice", [
                PROOF,
                p('All coached online. More on the <a href="/results">results page</a>. Individual results: yours depend on where you start and how consistently you follow the plan.'),
            ]),
            ("Eight weeks", "How to know within eight weeks", [
                p("You shouldn't have to take anyone's word for it. Eight weeks of honest tracking is enough to see whether something is moving: the scale, your waist, your measurements, your sleep or your eating habits."),
                p("That's what my <a href=\"/terms-coaching\">8-Week Progress Guarantee</a> is built on. Hold 80% or more on your weekly structure score for the first eight weeks. If none of those has improved, the next month is on me. The score measures whether you did the work, so if you did and nothing moved, that's on the plan, and fixing it is my job."),
            ]),
        ],
        faq=[
            ("Does online personal training actually work?", "It can, when it makes you track honestly and a coach reads that data and adjusts your plan. Self-monitoring is one of the most consistent predictors of weight loss in the research. A plan nobody checks tends to drift."),
            ("How much does online personal training cost in the UK?", "Typically £60 to £200 a month for standard online plans. One-to-one coaching where the coach personally reviews everything weekly costs more, though usually less than seeing a PT in person twice a week. The cost guide has the full breakdown."),
            ("How quickly will I see results?", "Most people see something move within eight weeks of consistent, honest tracking: weight, waist, measurements, sleep or eating habits. Lasting change takes months, which is why longer plans exist."),
            ("Is online coaching good for beginners?", "Yes, as long as you get proper form feedback. Send videos of your lifts and get notes back. If you've never set foot in a gym, a few in-person sessions to learn the basics can help too."),
        ],
    ),
    dict(
        slug="online-vs-in-person-personal-trainer",
        title="Online vs In-Person Personal Trainer | CALLUM.B",
        desc="Online coaching or a personal trainer in the gym? An honest comparison of cost, results, accountability and form coaching, and who each one suits best.",
        eyebrow="Guide · updated October 2026",
        h1=("Online or in-person", "personal trainer?"),
        lede="An in-person PT covers the hours you're in the gym. An online coach covers the whole week around them. Neither is better for everyone. Here's how they compare and which one suits you.",
        kind="article",
        sections=[
            ("Side by side", "How they compare", [
                table(["", "1:1 online coaching, like mine", "In-person PT", "Standard online plan"], [
                    ["Typical UK cost", "£67 to £113 a week, depending on the plan", "£35 to £65 a session. Twice a week is about £70 to £130 a week", "£60 to £200 a month"],
                    ["Hours covered", "Your whole week: food, training, steps, sleep", "The sessions you book", "Your week, loosely"],
                    ["Who reads your data", "Me, every week", "The PT, during the session", "Varies: the coach, an assistant or nobody"],
                    ["Form coaching", "Video notes back within 48 hours", "Live, hands-on", "Sometimes"],
                    ["Nutrition", "Macros from your real maintenance, reviewed weekly", "Varies, often general advice", "Often a template"],
                    ["Getting an answer", "WhatsApp, within 24 hours", "At the next session", "When the coach can"],
                ]),
                note("<b>Prices:</b> " + cite("gymguide") + "; " + cite("trainera") + ". In-person weekly figures are two sessions at £35 to £65."),
                p('Online coaching isn\'t one price because it isn\'t one service. A £60 plan and one-to-one coaching both get called "online", but they aren\'t the same thing. My 12-month plan works out at about £75 a week. That\'s less than two sessions a week with a Stockport PT at the £47 average, and it covers the whole week, not two hours of it. The full breakdown is in <a href="/online-personal-trainer-cost">what an online personal trainer costs</a>.'),
            ]),
            ("In-person", "When in-person is the better choice", [
                ul([
                    "You've never trained and need someone to teach you the lifts in person.",
                    "You're coming back from an injury and need hands-on supervision.",
                    "You only train when someone is physically waiting for you.",
                    "You enjoy it and the budget isn't a concern.",
                ]),
            ]),
            ("Online", "When online is the better choice", [
                ul([
                    "Your results stall because of food, sleep and weekends, not the sessions themselves.",
                    "Your week doesn't fit fixed appointments: shifts, kids, travel.",
                    "You can already train safely and want structure, progression and someone reading your data.",
                    "You want more support for less money than three sessions a week would cost.",
                ]),
            ]),
            ("The real lever", "Why the hours outside the gym matter more", [
                p("Most people overestimate what extra gym time does and underestimate food. Exercise-only programmes lost about 6kg less at a year than programmes combining diet and activity (" + cite("johns") + "). And people under-report what they eat by 47% on average (" + cite("lichtman") + "). An hour with a trainer can't fix a week of guessed meals."),
                p("That's the gap online coaching is built for. Three focused sessions a week, 10,000 steps a day, and macros hit most days, with someone checking all three every week."),
            ]),
            ("Both", "Or do both", [
                p("They aren't mutually exclusive. A few in-person sessions to learn the main lifts, then online coaching to run the whole week, is a sensible route for a complete beginner. If you already train, you can usually skip straight to online."),
                p('I\'m an online coach based in <a href="/online-personal-trainer-stockport">Stockport</a>, coaching men across the UK. If you want to see what that looks like week to week, the <a href="/coaching">coaching page</a> shows a real example check-in.'),
            ]),
        ],
        faq=[
            ("Is an online personal trainer as good as a real one?", "For most people who can already train safely, yes, and often better value, because online coaching covers food, steps and recovery as well as training. For a complete beginner, a few in-person sessions to learn technique first can help."),
            ("How do online trainers check your form?", "You film your working sets and upload them. A good coach sends back timestamped notes on set-up, tempo and range. I aim to return video feedback within 48 hours."),
            ("Which is cheaper?", "Online coaching, usually. Two in-person sessions a week costs roughly £70 to £130 a week in the UK. Standard online plans are about £60 to £200 a month, and one-to-one online coaching like mine is £67 to £113 a week, while covering the whole week rather than two hours of it."),
            ("Can I have an online coach and still train at my gym?", "Yes. That's the normal set-up. Your programme is written for the gym you already use, and you log every session for review."),
        ],
    ),
]


def faq_html(faq):
    items = "".join(
        f'<details><summary>{q}<span class="pm"></span></summary><p class="ans">{a}</p></details>' for q, a in faq
    )
    return f'<section class="tsec rv" id="faq" data-chap="Questions"><span class="tsec__n">?</span><div class="tsec__b"><h2 class="h-md">Questions</h2><div class="faq">{items}</div></div></section>'


def more_html(slug):
    links = "".join(f'<li><a href="{u}">{t}</a></li>' for u, t in KEEP_READING if u != "/" + slug)
    return f'<section class="tsec rv" id="more" data-chap="Keep reading"><span class="tsec__n">→</span><div class="tsec__b"><h2 class="h-md">Keep reading</h2><ul class="tl2">{links}</ul></div></section>'


def strip_tags(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s))


def schema(pg):
    url = f"{SITE}/{pg['slug']}"
    person = {"@type": "Person", "name": "Callum Broadfoot", "url": f"{SITE}/about", "jobTitle": "Online Transformation Coach"}
    graph = [{
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip_tags(a)}} for q, a in pg["faq"]],
    }]
    if pg["kind"] == "local":
        graph.insert(0, {
            "@type": "ProfessionalService",
            "name": "CALLUM.B Coaching",
            "url": SITE + "/",
            "image": f"{SITE}/og-image.jpg",
            "description": pg["desc"],
            "email": "callum@callumbcoaching.co.uk",
            "address": {"@type": "PostalAddress", "addressLocality": "Stockport", "addressRegion": "Greater Manchester", "addressCountry": "GB"},
            "areaServed": [{"@type": "City", "name": "Stockport"}, {"@type": "AdministrativeArea", "name": "Greater Manchester"}, {"@type": "Country", "name": "United Kingdom"}],
            "founder": person,
            "sameAs": ["https://instagram.com/callum.transformation.coach"],
        })
    else:
        graph.insert(0, {
            "@type": "Article",
            "headline": " ".join(pg["h1"]).rstrip("."),
            "description": pg["desc"],
            "mainEntityOfPage": url,
            "datePublished": TODAY,
            "dateModified": TODAY,
            "author": person,
            "publisher": {"@type": "Organization", "name": "CALLUM.B", "logo": {"@type": "ImageObject", "url": f"{SITE}/brand_assets/lion-crest.png"}},
            "image": f"{SITE}/og-image.jpg",
        })
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False) + "</script>"


def build(pg):
    url = f"{SITE}/{pg['slug']}"
    head = shell[:head_end]
    t, d = html.escape(pg["title"]), html.escape(pg["desc"])
    head = head.replace("<title>Coaching Terms | CALLUM.B</title>", f"<title>{t}</title>")
    head = re.sub(r'(<meta (?:name="description"|property="og:description") content=")[^"]*"', rf'\g<1>{d}"', head)
    head = re.sub(r'(<meta property="og:title" content=")[^"]*"', rf'\g<1>{t}"', head)
    head = head.replace(f"{SITE}/terms-coaching", url)
    head = head.replace('<meta name="robots" content="noindex,follow">\n', "")
    head = head.replace('<meta property="og:type" content="website">', f'<meta property="og:type" content="{"article" if pg["kind"] == "article" else "website"}">')
    head = head.replace("</head>", schema(pg) + "\n</head>")
    assert "terms-coaching" not in head.split("<body>")[0], pg["slug"]

    hero = f'''<main>
<section class="phero hero" id="top" data-chap="{"Stockport" if pg["kind"] == "local" else "The answer"}">
  <div class="hero__bg"><div class="glow green g-a" data-depth="-24"></div><div class="glow gold g-b" data-depth="30"></div></div>
  <div class="hero__vignette"></div>
  <div class="hframe" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="wrap" style="width:100%">
    <div class="phero__grid">
      <div>
        <p class="eyebrow">{pg["eyebrow"]}</p>
        <h1><span class="ln"><span>{pg["h1"][0]}</span></span><span class="ln" style="--d:1"><span class="it">{pg["h1"][1]}</span></span></h1>
        <p class="lede">{pg["lede"]}</p>
        <div class="actions" style="margin-top:var(--s4)"><a class="btn" href="/apply">Apply for 1:1 coaching <span class="arr">→</span></a></div>
      </div>
    </div>
  </div>
</section>
<div class="chap g1 terms-wrap"><div class="wrap">'''
    body = ""
    for i, (chap, h2, blocks) in enumerate(pg["sections"], 1):
        body += f'<section class="tsec rv" id="s{i}" data-chap="{chap}"><span class="tsec__n">{i:02d}</span><div class="tsec__b"><h2 class="h-md">{h2}</h2>{"".join(blocks)}</div></section>\n'
    body += faq_html(pg["faq"]) + "\n" + more_html(pg["slug"]) + "\n</div></div>\n"
    close = '''<section class="chap gl close" id="begin" data-chap="Begin">
  <div class="bg"><div class="glow gold"></div></div>
  <div class="wrap" style="padding-left:var(--gutter)">
    <img class="lionmark rv-s" src="brand_assets/lion-420.webp" alt="">
    <p class="eyebrow rv" style="justify-content:center">Structure over motivation</p>
    <h2 style="margin-top:var(--s3)"><span class="ln"><span>Tell me where</span></span><span class="ln" style="--d:1"><span class="it" style="color:var(--gold-deep)">you're at.</span></span></h2>
    <p class="run rv" style="--d:2">A short form, about two minutes, sent privately to me. I read every one myself, and I'll tell you straight if I can help.</p>
    <div class="actions rv" style="--d:3"><a class="btn" href="/apply">Apply for 1:1 coaching <span class="arr">→</span></a></div>
    <p class="label rv" style="--d:4;margin-top:var(--s4)">Application only · NDA as standard · the door doesn't close</p>
  </div>
</section>
'''
    out = head + hero + body + close + shell[foot_start:]
    assert "—" not in out and "–" not in strip_tags(body), pg["slug"]
    (ROOT / f"{pg['slug']}.html").write_text(out)
    return pg["slug"]


for pg in PAGES:
    print("built", build(pg))
