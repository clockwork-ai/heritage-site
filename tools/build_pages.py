"""Build about / coaching / results / apply from shared chrome, reusing Home's sections as the single source.
   python3 tools/build_pages.py   (run from the project root)"""
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from chrome import BURGER, mobile_menu

ROOT = pathlib.Path(__file__).resolve().parent.parent
home = (ROOT / "index.html").read_text()

def cut(start, end):
    a = home.index(start); b = home.index(end, a)
    return home[a:b]

def section(start, end, drop_chap=True):
    s = cut(start, end)
    if drop_chap:  # inner pages build their own thread, so reused sections keep no Home chapter labels
        s = re.sub(r' data-chap="[^"]*"', "", s)
    return s

GUARANTEE = section("<!-- the guarantee", "<!-- III · THE TURN -->")
INVEST = section("<!-- VI · THE INVESTMENT -->", "<!-- privacy + FAQ -->")
FAQ = section("<!-- privacy + FAQ -->", "<!-- VII · THE CLOSE -->")
CLIENTS = section("<!-- proof continues", "<!-- VI · THE INVESTMENT -->")
VF = cut('      <div class="vf" id="video-feedback">', '      <div class="app__foot rv">')
WA = "https://wa.me/447359838866"

def head(title, desc, path=""):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://callumbcoaching.co.uk/{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CALLUM.B">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://callumbcoaching.co.uk/{path}">
<meta property="og:image" content="https://callumbcoaching.co.uk/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://callumbcoaching.co.uk/og-image.jpg">
<meta name="theme-color" content="#09150F">
<link rel="icon" href="brand_assets/lion-420.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=GFS+Didot&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="heritage.css">
<link rel="stylesheet" href="components.css">
<!-- Privacy-friendly analytics by Plausible -->
<script async src="https://plausible.io/js/pa-YpqMGTgErTGeztJgwL1aw.js"></script>
<script>
  window.plausible=window.plausible||function(){{(plausible.q=plausible.q||[]).push(arguments)}},plausible.init=plausible.init||function(i){{plausible.o=i||{{}}}};
  plausible.init()
</script>
<script src="/assets/js/consent.js?v=2" defer></script>
<script src="/seasonal/config.js"></script>
<script src="/seasonal/boot.js"></script>
</head>
<body>
<div class="grain" aria-hidden="true"></div>
'''

def nav(active):
    links = [("/#method", "Method"), ("/results", "Results"), ("/about", "About"), ("/coaching", "Coaching")]
    cur = ' aria-current="page"'
    a = "".join(f'<a href="{h}"{cur if n == active else ""}>{n}</a>' for h, n in links)
    return f'''<header class="nav">
  <div class="nav__bar">
    <a class="mark" href="/" aria-label="CALLUM.B home"><img src="brand_assets/lion-420.webp" alt="">CALLUM<i>.</i>B</a>
    <nav class="nav__links" aria-label="Main">{a}</nav>
    <div class="nav__end"><a class="btn" href="/apply">Apply <span class="arr">→</span></a>{BURGER}</div>
  </div>
</header>
{mobile_menu(active)}
<div class="thread" aria-label="Page chapters"><div class="thread__track"></div><div class="thread__fill"></div><div class="thread__head"></div><ol></ol></div>
<main>
'''

FOOT = '''</main>
<footer class="foot">
  <div class="wrap">
    <div class="foot__grid">
      <div class="stack">
        <a class="mark" href="/"><img src="brand_assets/lion-420.webp" alt="">CALLUM<i>.</i>B</a>
        <p class="body" style="max-width:34ch">Structured physique development for men who are done guessing.</p>
        <p class="label">J3 University Level 1 Certified Coach</p>
      </div>
      <div><h4>Coaching</h4><ul><li><a href="/coaching">Premium 1:1</a></li><li><a href="/apply">Apply</a></li><li><a href="/the-ninety/">The Ninety</a></li><li><a href="/start/">Physique OS</a></li></ul></div>
      <div><h4>Explore</h4><ul><li><a href="/results">Results</a></li><li><a href="/about">About</a></li><li><a href="/tdee-calculator">TDEE calculator</a></li><li><a href="/trt-starter/">TRT framework</a></li></ul></div>
      <div><h4>Connect</h4><ul><li><a href="https://instagram.com/callum.transformation.coach" target="_blank" rel="noopener">Instagram</a></li><li><a href="/links/">All links</a></li><li><a href="/privacy">Privacy</a></li><li><a href="/terms-coaching">Coaching terms</a></li><li><a href="/terms">Site terms</a></li></ul></div>
    </div>
    <div class="foot__base"><span class="label">© 2026 CALLUM.B · Online Transformation Coach · United Kingdom</span><span class="label it" style="font-family:var(--didot);text-transform:none;letter-spacing:0;font-size:15px;color:var(--gold)">Structure over motivation.</span></div>
  </div>
</footer>
<script src="heritage.js"></script>
<script src="components.js"></script>
</body>
</html>
'''

def hero(chap, eyebrow, l1, l2, lede, img, alt, ctas=True, sid="top"):
    cta = f'''<div class="actions"><a class="btn" href="/apply">Apply for 1:1 coaching <span class="arr">→</span></a><a class="tlink" href="/#method">How the method works</a></div>''' if ctas else ""
    media = f'''<div class="phero__media hero__media" data-depth="-12"><div class="frame"><div class="media photo"><img src="{img}" alt="{alt}" width="800" height="1000"></div></div></div>''' if img else ""
    return f'''<section class="phero hero" id="{sid}" data-chap="{chap}">
  <div class="hero__bg"><div class="glow green g-a" data-depth="-24"></div><div class="glow gold g-b" data-depth="30"></div></div>
  <div class="hero__vignette"></div>
  <div class="hframe" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <div class="wrap" style="width:100%">
    <div class="phero__grid">
      <div>
        <p class="eyebrow">{eyebrow}</p>
        <h1><span class="ln"><span>{l1}</span></span><span class="ln" style="--d:1"><span class="it">{l2}</span></span></h1>
        <p class="lede">{lede}</p>
        {cta}
      </div>
      {media}
    </div>
  </div>
</section>
'''

def close(title_a, title_b, run, sid="begin"):
    return f'''<section class="chap gl close" id="{sid}" data-chap="Begin">
  <div class="bg"><div class="glow gold"></div></div>
  <div class="wrap" style="padding-left:var(--gutter)">
    <img class="lionmark rv-s" src="brand_assets/lion-420.webp" alt="">
    <p class="eyebrow rv" style="justify-content:center">Structure over motivation</p>
    <h2 style="margin-top:var(--s3)"><span class="ln"><span>{title_a}</span></span><span class="ln" style="--d:1"><span class="it" style="color:var(--gold-deep)">{title_b}</span></span></h2>
    <p class="run rv" style="--d:2">{run}</p>
    <div class="actions rv" style="--d:3"><a class="btn" href="/apply">Apply for 1:1 coaching <span class="arr">→</span></a></div>
    <p class="label rv" style="--d:4;margin-top:var(--s4)">Application only · NDA as standard · the door doesn't close</p>
  </div>
</section>
'''

def chap_attr(s, label):  # give a reused section a thread label
    return re.sub(r'(<section class="[^"]*")', rf'\1 data-chap="{label}"', s, count=1)

# ------------------------------------------------------------------ ABOUT
about = head("About Callum, Online Fitness Coach | CALLUM.B", "Callum's story: addiction, stage 2 hypertension, and the structure that rebuilt him. The same structure he now coaches.", "about") + nav("About")
about += hero("The man", "About Callum", "I've got an addictive personality.", "These days it works for me.",
  "For most of my life it worked against me. What changed wasn't willpower. I had plenty of that and it never once saved me. It was structure. That's the whole of what I coach, and I built it because I needed it.",
  "assets/photos/callum-about.webp", "Callum Broadfoot", ctas=False)
about += '''
<section class="chap g1" id="bottom" data-chap="The bottom">
  <div class="wrap">
    <div class="split">
      <div class="sticky stack">
        <p class="eyebrow rv">Where it started</p>
        <h2 class="h-lg"><span class="ln"><span>Broken, rebuilt,</span></span><span class="ln" style="--d:1"><span class="it gold-t">and rebuilt again.</span></span></h2>
      </div>
      <div class="stack">
        <p class="body rv">There's always been something. Drugs came first, early on, and I managed to shake those. But an addictive personality doesn't pack up and leave because you put one thing down. It goes looking for the next one.</p>
        <p class="body rv">Mine found drink, and it took its time about it. Nothing dramatic, no single day it started. Just more, slightly more often, over years, until I was getting through close to a litre of vodka most nights, smoking twenty to thirty a day, and eating whatever I could grab between working.</p>
        <p class="pull rv">Wake up, work, eat junk, <em>drink until I passed out,</em> repeat.</p>
        <p class="body rv">There's a photograph of me from November 2018, taken just before midnight. I'm unconscious on my own stairs. There's a stair gate in the shot. I couldn't bear to look at myself in the mirror.</p>
        <p class="body rv">It was the mornings, mostly. No energy. Just pushing through the day to get home, sit down and drink for comfort. Hanging on all day to feel something I should have been feeling anyway. Happy. Content. With my family. Not waiting on a drink for it.</p>
      </div>
    </div>
  </div>
</section>

<section class="chap g2" id="climb" data-chap="The climb" data-scene>
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">The way out</p>
      <h2 class="h-lg"><span class="ln"><span>I wanted to feel</span></span><span class="ln" style="--d:1"><span class="it gold-t">like myself again.</span></span></h2>
      <p class="lede rv" style="--d:2">It wasn't a straight line. It never is. Here's how it actually went.</p>
    </div>
    <div class="tl">
      <div class="tl__line" aria-hidden="true"><i></i></div>
      <div class="tl__item low rv"><span class="tl__dot"></span><span class="label">November 2018</span><h3 class="h-sm">Rock bottom</h3><p class="body">Unconscious on my own stairs just before midnight. Close to a litre of vodka most nights, twenty to thirty cigarettes a day.</p></div>
      <div class="tl__item rv"><span class="tl__dot"></span><span class="label">Then</span><h3 class="h-sm">Stopped drinking. A week later, stopped smoking.</h3><p class="body">The two things that were running my life, gone in a fortnight. The hard part was what came after.</p></div>
      <div class="tl__item rv"><span class="tl__dot"></span><span class="label">The plant-based years</span><h3 class="h-sm">Away from the old life, the wrong way</h3><p class="body">It got me out of the old habits, but pushed me towards processed food to hit protein. My health went backwards: weight on, insulin resistance.</p></div>
      <div class="tl__item low rv"><span class="tl__dot"></span><span class="label">January 2023</span><h3 class="h-sm">Stage 2 hypertension</h3><div class="tl__read">151/105 <small>pulse 114</small></div></div>
      <div class="tl__item rv"><span class="tl__dot"></span><span class="label">Rebuilt again</span><h3 class="h-sm">Keto, then carnivore, then structure</h3><p class="body">A ketogenic phase stabilised things. Over the following years I got my metabolic health back where it should be.</p></div>
      <div class="tl__item rv"><span class="tl__dot"></span><span class="label">March 2024</span><h3 class="h-sm">Same monitor. Same arm. No medication.</h3><div class="tl__read">113/69 <small>pulse 75</small></div></div>
      <div class="tl__item rv"><span class="tl__dot"></span><span class="label">Today</span><h3 class="h-sm">A balanced, structured diet</h3><p class="body">My body handles carbohydrate properly. And I coach the same structure that got me here.</p></div>
    </div>
  </div>
</section>

<section class="chap g3" id="lesson" data-chap="The lesson">
  <div class="wrap">
    <p class="bigpull rv">The problem was <em>never the vodka.</em></p>
    <div class="split" style="margin-top:var(--s5)">
      <div class="stack">
        <p class="body rv">Put one thing down and something else quietly picks up the slack. Willpower doesn't touch it, because willpower runs out and the personality doesn't.</p>
        <p class="body rv">The only thing that ever worked was building a structure that didn't need me to feel like it. <b>I stopped fighting my personality and gave it a job.</b> Now I build the same thing for other people.</p>
      </div>
      <div class="you rv">
        <p class="eyebrow" style="margin-bottom:var(--s2)">You'll recognise some of this</p>
        <p class="lede" style="font-size:clamp(17px,1.6vw,19px)">Maybe not the vodka. The wine that stopped being one glass. The work you can't switch off. The fourth restart this year that got to the end of week two.</p>
      </div>
    </div>
  </div>
</section>

<section class="chap g2" id="inches" data-chap="The inches">
  <div class="wrap">
    <div class="stack" style="max-width:800px">
      <p class="eyebrow rv">What I believe</p>
      <h2 class="h-lg"><span class="ln"><span>Transformation is won in inches.</span></span><span class="ln" style="--d:1"><span class="it gold-t">Fight for every one.</span></span></h2>
      <p class="lede rv" style="--d:2">The meal you log when you can't be bothered. The session you don't skip. The early night you choose. Invisible on their own. Add them up over months and they're the whole game. Motivation won't fight for the inches every day. A system will.</p>
    </div>
    <ul class="enum">
      <li class="rv"><span class="fnum">i</span><div><h3>Structure over motivation</h3><p>Motivation fluctuates. Structure removes emotional decision-making and replaces it with measurable control.</p></div></li>
      <li class="rv"><span class="fnum">ii</span><div><h3>Baseline before direction</h3><p>Maintenance defines your reference. Reference defines precision. We calibrate before we cut or build.</p></div></li>
      <li class="rv"><span class="fnum">iii</span><div><h3>One variable at a time</h3><p>Change one thing, observe, then decide. Daily reactions destroy control. Weekly averages reveal the truth.</p></div></li>
      <li class="rv"><span class="fnum">iv</span><div><h3>Consistency compounds</h3><p>Sustainable execution outperforms aggression. Protect output, preserve adherence, and let time do its work.</p></div></li>
    </ul>
  </div>
</section>

<section class="chap g1" id="numbers" data-chap="My numbers">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">Proof, not promises</p>
      <h2 class="h-lg"><span class="ln"><span>My own</span></span><span class="ln" style="--d:1"><span class="it gold-t">numbers.</span></span></h2>
      <p class="lede rv" style="--d:2">I ask every client to track honestly and let the data tell the truth. It would be a bit rich not to show you mine.</p>
    </div>
    <div class="numbers">
      <div class="stack">
        <div class="monitors">
          <div class="media photo rv-s"><img src="assets/photos/bp-callum-before.webp" alt="Blood pressure monitor reading 151 over 105, pulse 114" loading="lazy" width="560" height="711"><div class="cap"><span class="label">Jan 2023</span></div></div>
          <div class="media photo rv-s" style="--d:1"><img src="assets/photos/bp-callum-after.webp" alt="Blood pressure monitor reading 113 over 69, pulse 75" loading="lazy" width="560" height="711"><div class="cap"><span class="label">Mar 2024</span></div></div>
        </div>
        <div class="bp" style="border-top-color:var(--line)">
          <div><span class="n" style="color:var(--cream)" data-count="-38">0</span><span class="label">Systolic</span></div>
          <div><span class="n" style="color:var(--cream)" data-count="-36">0</span><span class="label">Diastolic</span></div>
          <div><span class="n" style="color:var(--cream)" data-count="-39">0</span><span class="label">Resting pulse</span></div>
          <div><span class="n" style="color:var(--cream)" data-count="0">0</span><span class="label">Medication</span></div>
        </div>
      </div>
      <div class="pair">
        <div class="media photo rv-s"><img src="assets/photos/callum-before-2023.webp" alt="Callum in January 2023" loading="lazy" width="720" height="960"><div class="cap"><span class="label">Jan 2023</span></div></div>
        <div class="media photo rv-s" style="--d:1"><img src="assets/photos/callum-now-2026.webp" alt="Callum in December 2025" loading="lazy" width="720" height="960"><div class="cap"><span class="label">Dec 2025</span></div></div>
      </div>
    </div>
    <p class="label rv" style="margin-top:var(--s4)">Nobody does this in twelve weeks. Blood pressure figures are my own and aren't medical advice. If yours looks like the left-hand one, see your GP, not a coach.</p>
  </div>
</section>

<section class="chap g3" id="coach" data-chap="The coach">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">How I coach</p>
      <h2 class="h-md rv">Every client, <span class="it gold-t">personally.</span></h2>
    </div>
    <div class="creds">
      <article class="panel lift rv"><span class="label">Qualified</span><h3 class="h-sm" style="margin-top:10px">J3 University Level 1</h3><p class="body" style="margin-top:8px;font-size:15px">Certified coach through a NASM approved provider.</p></article>
      <article class="panel lift rv" style="--d:1"><span class="label">TRT-aware</span><h3 class="h-sm" style="margin-top:10px">Bloods read with you</h3><p class="body" style="margin-top:8px;font-size:15px">Medication decisions stay with you and your prescriber. I handle the structure and the monitoring around it.</p></article>
      <article class="panel lift rv" style="--d:2"><span class="label">One-to-one</span><h3 class="h-sm" style="margin-top:10px">It's me, every week</h3><p class="body" style="margin-top:8px;font-size:15px">Every check-in, every video review, every WhatsApp answer. No assistants handing you off.</p></article>
    </div>
  </div>
</section>
'''
about += close("If that sounds like", "your problem.", "I'm not going to tell you to want it more, or hand you a plan that only works on the days you feel like it. <a href=\"/apply\">I'll build you a structure that holds when you don't.</a>")
about += FOOT

# ------------------------------------------------------------------ COACHING
co = head("Online Fitness Coaching Plans UK | CALLUM.B", "Premium 1:1 coaching. Calibrated nutrition, structured training, weekly reviews, video feedback and WhatsApp access, built around your real life.", "coaching") + nav("Coaching")
co += hero("The offer", "Premium 1:1 coaching · application only", "Structured transformation,", "with real oversight.",
  "For the man who's ready to stop guessing. We install the system, programme every phase, and I hold you to the structure, week after week, against your actual data.",
  "assets/photos/callum-gym.webp", "Callum training in the gym")
co += '''
<section class="chap g1" id="fit" data-chap="Who it's for">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">Straight answer</p>
      <h2 class="h-lg"><span class="ln"><span>Who this is,</span></span><span class="ln" style="--d:1"><span class="it gold-t">and isn't, for.</span></span></h2>
    </div>
    <div class="fit">
      <div class="panel yes rv"><span class="label" style="color:var(--good)">This is for you if</span><ul>
        <li style="--d:0">You want a measurable system, not another crash diet</li><li style="--d:1">You'll commit to weekly check-ins and honest data</li><li style="--d:2">You value structure and patience over quick fixes</li><li style="--d:3">You've restarted more than once and you're done restarting</li><li style="--d:4">You're ready to be coached and held accountable</li></ul></div>
      <div class="panel no rv" style="--d:1"><span class="label" style="color:var(--bad)">It's not for you if</span><ul>
        <li style="--d:0">You want a six-week shred and then back to chaos</li><li style="--d:1">You react to the scale daily and change everything at once</li><li style="--d:2">You're not willing to track what you eat</li><li style="--d:3">You want motivation instead of a system</li></ul></div>
    </div>
  </div>
</section>

<section class="chap g2" id="included" data-chap="What you get">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">What you get</p>
      <h2 class="h-lg"><span class="ln"><span>The system installs.</span></span><span class="ln" style="--d:1"><span class="it gold-t">Coaching drives it.</span></span></h2>
    </div>
    <div class="gets">
      <article class="panel lift get rv"><span class="k">01 · Baseline</span><h3 class="h-sm">Calibrated macros</h3><p class="body">Your true maintenance, protein, carbs and fats set to your goal, plus steps and training frequency.</p></article>
      <article class="panel lift get rv" style="--d:1"><span class="k">02 · Training</span><h3 class="h-sm">Structured programme</h3><p class="body">Three gym sessions a week and 10,000 steps a day as the baseline, with progressive overload built in.</p></article>
      <article class="panel lift get rv" style="--d:2"><span class="k">03 · Reviews</span><h3 class="h-sm">Weekly check-ins</h3><p class="body">Macro audits, training review and one adjustment at a time, read against your real numbers.</p></article>
      <article class="panel lift get rv" style="--d:3"><span class="k">04 · Form</span><h3 class="h-sm">Video feedback</h3><p class="body">Film your sets, get timestamped notes back within 48 hours.</p></article>
      <article class="panel lift get rv"><span class="k">05 · Access</span><h3 class="h-sm">WhatsApp, answered in 24h</h3><p class="body">A direct line for questions and accountability, so you're never executing blind.</p></article>
      <article class="panel lift get rv" style="--d:1"><span class="k">06 · Health</span><h3 class="h-sm">Bloods read with you</h3><p class="body">TRT-aware coaching. Your blood work read by someone who knows what he's looking at.</p></article>
      <article class="panel lift get rv" style="--d:2"><span class="k">07 · Adjustments</span><h3 class="h-sm">Diet breaks, planned</h3><p class="body">The 14-day rule, diet breaks and refeeds, used with restraint to protect your output.</p></article>
      <article class="panel lift get rv" style="--d:3"><span class="k">08 · The exit</span><h3 class="h-sm">You keep the system</h3><p class="body">You don't just finish lean. You leave knowing how to run it yourself.</p></article>
    </div>
  </div>
</section>

<section class="chap g3" id="pillars" data-chap="The pillars">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">What every plan is built on</p>
      <h2 class="h-lg"><span class="ln"><span>Four pillars.</span></span><span class="ln" style="--d:1"><span class="it gold-t">Every week.</span></span></h2>
    </div>
    <div class="temple" data-in>
      <div class="temple__rays" aria-hidden="true"></div>
      <div class="motes temple__motes" aria-hidden="true"><b style="left:8%;--dl:-2s;--dur2:14s"></b><b style="left:17%;--dl:-9s;--dur2:18s"></b><b style="left:29%;--dl:-5s;--dur2:16s"></b><b style="left:38%;--dl:-12s;--dur2:20s"></b><b style="left:46%;--dl:-3s;--dur2:15s"></b><b style="left:58%;--dl:-8s;--dur2:19s"></b><b style="left:66%;--dl:-1s;--dur2:17s"></b><b style="left:74%;--dl:-11s;--dur2:21s"></b><b style="left:85%;--dl:-6s;--dur2:16s"></b><b style="left:93%;--dl:-14s;--dur2:22s"></b></div>
      <div class="colonnade" aria-hidden="true"><div class="colw" style="--d:0"><svg class="col" viewBox="0 0 120 420" aria-hidden="true"><defs><linearGradient id="colg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C6020" stop-opacity=".35"/><stop offset=".45" stop-color="#E8C987" stop-opacity=".22"/><stop offset="1" stop-color="#7C6020" stop-opacity=".3"/></linearGradient></defs><g class="col__body"><rect x="6" y="8" width="108" height="14"/><path d="M14 22 Q60 44 106 22 L100 40 Q60 56 20 40 Z"/><rect x="22" y="40" width="76" height="12"/><path class="col__shaft" d="M25 52 L95 52 L91 378 L29 378 Z" fill="url(#colg)"/><g class="col__flutes"><line x1="30" y1="64" x2="30" y2="372"/><line x1="39" y1="64" x2="39" y2="372"/><line x1="48" y1="64" x2="48" y2="372"/><line x1="57" y1="64" x2="57" y2="372"/><line x1="66" y1="64" x2="66" y2="372"/><line x1="75" y1="64" x2="75" y2="372"/><line x1="84" y1="64" x2="84" y2="372"/></g><rect x="20" y="378" width="80" height="12"/><rect x="12" y="390" width="96" height="12"/><rect x="4" y="402" width="112" height="14"/></g></svg><span class="col__light"></span></div><div class="colw" style="--d:1"><svg class="col" viewBox="0 0 120 420" aria-hidden="true"><defs><linearGradient id="colg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C6020" stop-opacity=".35"/><stop offset=".45" stop-color="#E8C987" stop-opacity=".22"/><stop offset="1" stop-color="#7C6020" stop-opacity=".3"/></linearGradient></defs><g class="col__body"><rect x="6" y="8" width="108" height="14"/><path d="M14 22 Q60 44 106 22 L100 40 Q60 56 20 40 Z"/><rect x="22" y="40" width="76" height="12"/><path class="col__shaft" d="M25 52 L95 52 L91 378 L29 378 Z" fill="url(#colg)"/><g class="col__flutes"><line x1="30" y1="64" x2="30" y2="372"/><line x1="39" y1="64" x2="39" y2="372"/><line x1="48" y1="64" x2="48" y2="372"/><line x1="57" y1="64" x2="57" y2="372"/><line x1="66" y1="64" x2="66" y2="372"/><line x1="75" y1="64" x2="75" y2="372"/><line x1="84" y1="64" x2="84" y2="372"/></g><rect x="20" y="378" width="80" height="12"/><rect x="12" y="390" width="96" height="12"/><rect x="4" y="402" width="112" height="14"/></g></svg><span class="col__light"></span></div><div class="colw" style="--d:2"><svg class="col" viewBox="0 0 120 420" aria-hidden="true"><defs><linearGradient id="colg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C6020" stop-opacity=".35"/><stop offset=".45" stop-color="#E8C987" stop-opacity=".22"/><stop offset="1" stop-color="#7C6020" stop-opacity=".3"/></linearGradient></defs><g class="col__body"><rect x="6" y="8" width="108" height="14"/><path d="M14 22 Q60 44 106 22 L100 40 Q60 56 20 40 Z"/><rect x="22" y="40" width="76" height="12"/><path class="col__shaft" d="M25 52 L95 52 L91 378 L29 378 Z" fill="url(#colg)"/><g class="col__flutes"><line x1="30" y1="64" x2="30" y2="372"/><line x1="39" y1="64" x2="39" y2="372"/><line x1="48" y1="64" x2="48" y2="372"/><line x1="57" y1="64" x2="57" y2="372"/><line x1="66" y1="64" x2="66" y2="372"/><line x1="75" y1="64" x2="75" y2="372"/><line x1="84" y1="64" x2="84" y2="372"/></g><rect x="20" y="378" width="80" height="12"/><rect x="12" y="390" width="96" height="12"/><rect x="4" y="402" width="112" height="14"/></g></svg><span class="col__light"></span></div><div class="colw" style="--d:3"><svg class="col" viewBox="0 0 120 420" aria-hidden="true"><defs><linearGradient id="colg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C6020" stop-opacity=".35"/><stop offset=".45" stop-color="#E8C987" stop-opacity=".22"/><stop offset="1" stop-color="#7C6020" stop-opacity=".3"/></linearGradient></defs><g class="col__body"><rect x="6" y="8" width="108" height="14"/><path d="M14 22 Q60 44 106 22 L100 40 Q60 56 20 40 Z"/><rect x="22" y="40" width="76" height="12"/><path class="col__shaft" d="M25 52 L95 52 L91 378 L29 378 Z" fill="url(#colg)"/><g class="col__flutes"><line x1="30" y1="64" x2="30" y2="372"/><line x1="39" y1="64" x2="39" y2="372"/><line x1="48" y1="64" x2="48" y2="372"/><line x1="57" y1="64" x2="57" y2="372"/><line x1="66" y1="64" x2="66" y2="372"/><line x1="75" y1="64" x2="75" y2="372"/><line x1="84" y1="64" x2="84" y2="372"/></g><rect x="20" y="378" width="80" height="12"/><rect x="12" y="390" width="96" height="12"/><rect x="4" y="402" width="112" height="14"/></g></svg><span class="col__light"></span></div></div>
    <div class="pillars">
      <div class="pillar rv"><span class="n">i</span><h3 class="h-sm">Nutrition</h3><p class="body">Full macros hit, weekdays and weekends. Treats planned in, not fought.</p></div>
      <div class="pillar rv" style="--d:1"><span class="n">ii</span><h3 class="h-sm">Training</h3><p class="body">Every set logged, every week progressed. The numbers go up or we find out why.</p></div>
      <div class="pillar rv" style="--d:2"><span class="n">iii</span><h3 class="h-sm">Steps</h3><p class="body">The quiet lever. Daily movement that keeps fat loss moving without more cardio.</p></div>
      <div class="pillar rv" style="--d:3"><span class="n">iv</span><h3 class="h-sm">Check-ins</h3><p class="body">Your weekly review. Together the four pillars make your structure score, the number the guarantee is measured on.</p></div>
    </div>
    </div>
  </div>
</section>

<section class="chap g2" id="feedback" data-chap="In the gym">
  <div class="wrap">
''' + VF + '''  </div>
</section>

<section class="chap g1" id="process" data-chap="After you apply">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">No pressure, no pitch</p>
      <h2 class="h-lg"><span class="ln"><span>What happens</span></span><span class="ln" style="--d:1"><span class="it gold-t">after you apply.</span></span></h2>
    </div>
    <ol class="flow">
      <li class="rv"><h3 class="h-sm">You apply</h3><p class="body">A short form, about two minutes, sent privately to me.</p></li>
      <li class="rv" style="--d:1"><h3 class="h-sm">I read it myself</h3><p class="body">Every application, personally. I'll tell you straight if I can help.</p></li>
      <li class="rv" style="--d:2"><h3 class="h-sm">A quick chat</h3><p class="body">If it helps, a short call to check we're the right fit.</p></li>
      <li class="rv" style="--d:3"><h3 class="h-sm">Choose your plan</h3><p class="body">Terms confirmed in writing, then a secure payment link.</p></li>
      <li class="rv" style="--d:4"><h3 class="h-sm">Week one</h3><p class="body">We calibrate your baseline before a single thing changes.</p></li>
    </ol>
  </div>
</section>
'''
co += chap_attr(GUARANTEE, "The guarantee") + chap_attr(INVEST, "Investment") + FAQ
co += close("Tell me", "where you're at.", "The application takes two minutes and gets you a straight answer. <a href=\"/apply\">Apply for coaching</a>, or <a href=\"/start/\">start free on Physique&nbsp;OS</a>.")
co += FOOT

# ------------------------------------------------------------------ RESULTS
re_ = head("Client Transformations and Results | CALLUM.B", "Real client transformations from 1:1 online coaching: photos, measurements, blood pressure and their own words.", "results") + nav("Results")
re_ += hero("Results", "Client results", "Real transformations.", "Built on structure.",
  "Their photos, their numbers, their own words. Ordinary men with jobs, families and busy weeks, following the same structure.", None, None)
re_ += chap_attr(CLIENTS, "Clients")
re_ += '''
<section class="chap g2" id="mine" data-chap="Proven on me">
  <div class="wrap">
    <div class="stack" style="max-width:760px">
      <p class="eyebrow rv">Proven on me first</p>
      <h2 class="h-md rv">Before I coached anyone, <span class="it gold-t">I did it myself.</span></h2>
      <p class="body rv">Stage 2 hypertension to normal, with no medication, in fourteen months. <a class="tlink" href="/about">Read my story</a></p>
    </div>
    <div class="numbers">
      <div class="monitors">
        <div class="media photo rv-s"><img src="assets/photos/bp-callum-before.webp" alt="Blood pressure monitor reading 151 over 105" loading="lazy" width="560" height="711"><div class="cap"><span class="label">Jan 2023 · 151/105</span></div></div>
        <div class="media photo rv-s" style="--d:1"><img src="assets/photos/bp-callum-after.webp" alt="Blood pressure monitor reading 113 over 69" loading="lazy" width="560" height="711"><div class="cap"><span class="label">Mar 2024 · 113/69</span></div></div>
      </div>
      <div class="pair">
        <div class="media photo rv-s"><img src="assets/photos/callum-before-2023.webp" alt="Callum in January 2023" loading="lazy" width="720" height="960"><div class="cap"><span class="label">Jan 2023</span></div></div>
        <div class="media photo rv-s" style="--d:1"><img src="assets/photos/callum-now-2026.webp" alt="Callum in December 2025" loading="lazy" width="720" height="960"><div class="cap"><span class="label">Dec 2025</span></div></div>
      </div>
    </div>
  </div>
</section>
'''
re_ += close("Your photos", "could be next.", "Every result on this page started with one application. <a href=\"/apply\">Tell me where you're at.</a>")
re_ += FOOT

# ------------------------------------------------------------------ APPLY
ap = head("Apply for 1:1 Online Coaching | CALLUM.B", "Apply for 1:1 coaching. A short private application, read personally, with a straight answer within 24 hours.", "apply") + nav("")
ap += hero("Apply", "1:1 coaching · application", "Tell me", "where you're at.",
  "Two minutes, completely private. I read every application myself and reply within 24 hours. If I'm not the right fit for you, I'll say so.", None, None, ctas=False)
ap += '''
<section class="chap g2" id="form" data-chap="Your application">
  <div class="wrap">
    <form class="applyf" id="applyForm" novalidate>
      <div class="two">
        <div class="field"><label for="f-name">First name</label><input type="text" id="f-name" name="name" autocomplete="given-name" required></div>
        <div class="field"><label for="f-age">Age</label><input type="number" id="f-age" name="age" min="18" max="90" inputmode="numeric"></div>
      </div>
      <fieldset class="field"><legend>What do you want most?</legend>
        <div class="chips">
          <label><input type="checkbox" name="goal" value="Lose fat"><span>Lose fat</span></label>
          <label><input type="checkbox" name="goal" value="Build muscle"><span>Build muscle</span></label>
          <label><input type="checkbox" name="goal" value="Get my health back"><span>Get my health back</span></label>
          <label><input type="checkbox" name="goal" value="Energy and confidence"><span>Energy and confidence</span></label>
          <label><input type="checkbox" name="goal" value="Stop restarting"><span>Stop restarting</span></label>
        </div></fieldset>
      <div class="field"><label for="f-tried">What's gone wrong when you've tried before?</label><p class="hint">Honest is better than tidy. Nobody else reads this.</p><textarea id="f-tried" name="tried"></textarea></div>
      <div class="field"><label for="f-week">What does your week look like?</label><p class="hint">Work, kids, shifts, how many days you could train.</p><textarea id="f-week" name="week" style="min-height:80px"></textarea></div>
      <fieldset class="field"><legend>Which plan are you leaning towards?</legend>
        <div class="chips">
          <label><input type="radio" name="plan" value="12 months, Structured Development"><span>12 months</span></label>
          <label><input type="radio" name="plan" value="6 months, Transformation"><span>6 months</span></label>
          <label><input type="radio" name="plan" value="12 weeks, Foundation"><span>12 weeks</span></label>
          <label><input type="radio" name="plan" value="Not sure yet" checked><span>Not sure yet</span></label>
        </div></fieldset>
      <fieldset class="field"><legend>How would you like me to reply?</legend>
        <div class="chips">
          <label><input type="radio" name="reply" value="WhatsApp message" checked><span>WhatsApp message</span></label>
          <label><input type="radio" name="reply" value="A quick call"><span>A quick call</span></label>
        </div></fieldset>
      <div class="actions" style="margin-top:0"><button class="btn" type="submit">Review my application <span class="arr">→</span></button><span class="label">Nothing is sent until you press send</span></div>
    </form>
    <div class="applydone" id="applyDone" hidden>
      <p class="eyebrow">Ready to send</p>
      <h3 class="h-md" style="margin-top:var(--s2)">Here's your application.</h3>
      <p class="body" style="margin-top:var(--s2)">Tap send and it opens WhatsApp with this filled in. You just press send there. I'll reply within 24 hours.</p>
      <pre id="applyText"></pre>
      <div class="actions" style="margin-top:0"><a class="btn" id="applySend" href="''' + WA + '''" target="_blank" rel="noopener">Send on WhatsApp <span class="arr">→</span></a><button class="tlink" type="button" id="applyEdit" style="background:none;border:0;cursor:pointer">Edit my answers</button></div>
    </div>
    <div class="next">
      <article class="panel rv"><span class="label">Within 24 hours</span><h3 class="h-sm" style="margin-top:10px">I reply myself</h3><p class="body" style="margin-top:8px;font-size:15px">Not a bot, not an assistant. A straight answer on whether I can help.</p></article>
      <article class="panel rv" style="--d:1"><span class="label">No pressure</span><h3 class="h-sm" style="margin-top:10px">No pitch</h3><p class="body" style="margin-top:8px;font-size:15px">If it's not the right fit, I'll tell you, and point you somewhere useful.</p></article>
      <article class="panel rv" style="--d:2"><span class="label">Private</span><h3 class="h-sm" style="margin-top:10px">NDA as standard</h3><p class="body" style="margin-top:8px;font-size:15px">If you'd rather nobody knew you were doing this, nobody will.</p></article>
    </div>
  </div>
</section>
<script>
(() => {
  const f = document.getElementById("applyForm"), done = document.getElementById("applyDone"), out = document.getElementById("applyText"), send = document.getElementById("applySend");
  f.addEventListener("submit", e => {
    e.preventDefault();
    const d = new FormData(f), v = k => (d.get(k) || "").toString().trim();
    const goals = d.getAll("goal").join(", ");
    const lines = [
      "Hi Callum, here's my application for 1:1 coaching.", "",
      "Name: " + (v("name") || "-"), "Age: " + (v("age") || "-"),
      "What I want: " + (goals || "-"), "",
      "What's gone wrong before: " + (v("tried") || "-"), "",
      "My week: " + (v("week") || "-"), "",
      "Plan: " + v("plan"), "Best reply: " + v("reply")
    ];
    const msg = lines.join("\\n");
    out.textContent = msg;
    send.href = "''' + WA + '''?text=" + encodeURIComponent(msg);
    f.hidden = true; done.hidden = false;
    done.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("applyEdit").addEventListener("click", () => { done.hidden = true; f.hidden = false; f.scrollIntoView({ behavior: "smooth", block: "start" }); });
})();
</script>
'''
ap += FOOT

for name, html in [("about.html", about), ("coaching.html", co), ("results.html", re_), ("apply.html", ap)]:
    (ROOT / name).write_text(html)
    print(name, len(html) // 1024, "KB")

# ------------------------------------------------------------------ TERMS (published as premium-terms-direct.html)
def tbl(head, rows, cls=""):
    h = "".join(f"<th>{c}</th>" for c in head)
    b = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="tt {cls}"><table><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table></div>'

def tsec(n, title, body, chap):
    return f'''<section class="tsec rv" id="t{n}" data-chap="{chap}"><span class="tsec__n">{n:02d}</span><div class="tsec__b"><h2 class="h-md">{title}</h2>{body}</div></section>
'''

tm = head("Coaching Terms | CALLUM.B", "The terms for CALLUM.B premium 1:1 coaching: what acceptance means, the standard, the guarantee, the money and your data.", "terms-coaching").replace('<meta name="theme-color"', '<meta name="robots" content="noindex,follow">\n<meta name="theme-color"') + nav("")
tm += hero("The terms", "Premium 1:1 coaching · terms v3 · October 2026", "The terms,", "in plain English.",
  "This is what you're stepping into. Nothing here is buried, and every number stays visible to you the whole way through.", None, None, ctas=False)
tm += '<div class="chap g1 terms-wrap"><div class="wrap"><div class="tbar rv"><span class="label">Applies to every 1:1 package</span><button class="tlink" type="button" onclick="window.print()" style="background:none;border:0;cursor:pointer">Print or save as PDF</button></div>'
tm += tsec(1, "What acceptance means", '''<ul class="tl2">
<li><b>Payment secures your place.</b> The payment link comes first, and your onboarding form arrives the moment it's paid.</li>
<li><b>Full premium from day one:</b> coached training and cardio, your nutrition build and the weekly check-in rhythm. The complete programme, not a roadmap.</li>
<li><b>Programmes start on a Monday.</b> The days between payment and your first Monday are your setup window: the app, baseline photos, measurements and your first weigh-in.</li></ul>''', "Acceptance")
tm += tsec(2, "The standard: what's tracked", '''<p class="body">Premium runs on data. The same five inputs are tracked and scored at every weekly check-in. It's how the coaching stays honest, and everything that's scored is visible to you at all times.</p>''' +
  tbl(["Input", "What counts", "Weight"], [["Nutrition logged", "Days your food is logged, out of 7", "35%"], ["Daily weigh-ins", "Days you weigh in, out of 7 (aim for 6+)", "25%"], ["Weekly check-in", "Submitted on time", "15%"], ["Progress photo", "Submitted each Sunday", "12.5%"], ["Body measurements", "Taken and submitted each week", "12.5%"]]) +
  '''<p class="tnote"><b>If adherence drops:</b> three weeks in a row below 80% triggers a review call. If nothing changes after it, the programme moves to the £99 a month fallback (nutrition and tracking only) until the standard returns.</p>''', "The standard")
tm += tsec(3, "The 8-Week Progress Guarantee", '''<p class="lede" style="font-size:clamp(17px,1.6vw,19px)">Hold 80%+ on your weekly SDR score for the first eight weeks. <b>If nothing has improved, the next month is on me.</b></p>
<ul class="tl2">
<li><b>Applies to</b> every 1:1 package.</li>
<li><b>The window</b> is your first eight weeks of coaching.</li>
<li><b>The condition</b> is a score of 80% or more at every weekly check-in in that window, using the inputs in section 2.</li>
<li><b>Paid upfront:</b> if nothing has improved, a free month is added to the end of your plan. If the score holds 80%+ through that month and still nothing has improved, a second free month is added. Two free months is the maximum.</li></ul>''', "Guarantee")
tm += tsec(4, "The money", tbl(["Package", "Paid upfront"], [["12 Week Foundation", "£1,200"], ["6 Month Transformation", "£2,200"], ["12 Month Structured Development", "£3,500"]], "money") +
  '''<p class="body">These three packages are paid upfront. There is no monthly plan and no instalment plan. <a href="/rebuild">The Full Rebuild</a> is separate: £12,000 for the year, 52 weeks, application only, with no checkout on the site. It can be paid quarterly, with the first quarter paid upfront. If you're accepted, the terms for that place are confirmed in writing before any payment link.</p><ul class="tl2">
<li><b>Payment for these three is upfront.</b> It secures your place. You get the payment link after you're accepted, with these terms confirmed in writing first.</li>
<li><b>14-day cooling-off</b> from the day of purchase, less the value of coaching already delivered.</li>
<li><b>Leaving early:</b> you can stop at any time. Coaching already delivered isn't refunded.</li></ul>''', "The money")
tm += tsec(5, "Application and fit", '''<p class="body">Coaching is application only because the fit has to be right for both of us. I read every application myself. If I don't think I'm the right coach for you, I'll tell you straight rather than take your money.</p>''', "Fit")
tm += tsec(6, "Your data", '''<ul class="tl2">
<li>Everything that scores you is visible to you: every weigh-in, every log, every percentage, at all times.</li>
<li>Your data is used to coach you and nothing else. It isn't sold or shared.</li>
<li>You can ask for a copy, or for it to be deleted, at any time after we finish working together.</li></ul>''', "Your data")
tm += tsec(7, "The medical line", '''<p class="body">I'm your coach, not your doctor. Nothing in this process is medical advice. GLP-1 dosing, medication changes and anything health-related stay with your prescriber or GP, always. Tell me what they decide, and I'll build the coaching around it.</p>''', "Medical")
tm += '''<section class="tsign rv" id="agree" data-chap="Agreement">
  <p class="body"><b>Agreement:</b> by making payment you're accepting the terms above: the standard in section 2, the guarantee in section 3, the money in section 4, and the shared understanding that adherence, not the outcome, is what's being measured.</p>
  <div class="tsign__row"><div><p class="it" style="font-family:var(--didot);font-size:28px;color:var(--gold);margin:0">Callum</p><span class="label">Callum Broadfoot · CALLUM.B</span></div><div class="tsign__line"><span class="label">Client signature and date</span></div></div>
</section>
</div></div>
'''
tm += FOOT
(ROOT / "terms-coaching.html").write_text(tm)
print("terms-coaching", len(tm) // 1024, "KB")
