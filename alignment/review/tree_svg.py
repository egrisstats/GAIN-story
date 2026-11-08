"""Write the decision tree as an inline SVG snippet (alignment/review/tree.svg.html), from spec/decision_tree.json thresholds."""
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
spec = json.loads((root / "alignment/spec/decision_tree.json").read_text())
t = spec["thresholds"]

W, NX, NW, OX, OW = 680, 20, 300, 396, 268
CX = NX + NW // 2
out = []
add = out.append

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def node(y, h, n, title, sub=None):
    add(f'<rect x="{NX}" y="{y}" width="{NW}" height="{h}" rx="6" class="tn"/>')
    ty = y + (h / 2 + 4 if not sub else 18)
    add(f'<text x="{NX + 12}" y="{ty}" class="tq"><tspan class="tnum">{n}</tspan>  {esc(title)}</text>')
    for i, s in enumerate(sub or []):
        add(f'<text x="{NX + 12}" y="{y + 34 + 13 * i}" class="ts">{esc(s)}</text>')

def outcome(y, cls, title, cond):
    add(f'<g class="to {cls}"><rect x="{OX}" y="{y}" width="{OW}" height="40" rx="6" class="tob"/>'
        f'<rect x="{OX}" y="{y}" width="4" height="40" rx="2" class="tos"/>'
        f'<text x="{OX + 14}" y="{y + 17}" class="tot">{esc(title)}</text>'
        f'<text x="{OX + 14}" y="{y + 32}" class="ts">{esc(cond)}</text></g>')

def down(y1, y2, label=None):
    add(f'<path d="M{CX},{y1} V{y2 - 2}" class="ta" marker-end="url(#tarr)"/>')
    if label:
        add(f'<text x="{CX + 8}" y="{(y1 + y2) / 2 + 4}" class="tl">{esc(label)}</text>')

def side(yc, targets, label=None):
    """from the node's right edge at yc to each outcome centre, with an elbow at x=360"""
    for ty in targets:
        add(f'<path d="M{NX + NW},{yc} H360 V{ty} H{OX - 2}" class="ta" marker-end="url(#tarr)"/>')
    if label:
        add(f'<text x="{NX + NW + 6}" y="{yc - 5}" class="tl">{esc(label)}</text>')

add(f'<svg viewBox="0 0 {W} 556" role="img" aria-label="The alignment decision tree: five steps from a No or Don’t know answer to an outcome" xmlns="http://www.w3.org/2000/svg">')
add('<defs><marker id="tarr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" class="tah"/></marker></defs>')
# start
add(f'<rect x="{CX - 110}" y="10" width="220" height="30" rx="15" class="tstart"/>')
add(f'<text x="{CX}" y="29" text-anchor="middle" class="tq">Said No or Don’t know</text>')
down(40, 64)
node(64, 44, "1", "Producing statistics?")
side(86, [86], "No")
outcome(66, "o-keep", "Keep the answer", "Not statistics: flag for the validity check")
down(108, 150, "Yes")
node(150, 44, "2", "What reason do they give?")
side(172, [146, 198])
outcome(126, "o-keep", "Keep the answer", "They chose not to apply the recommendations")
outcome(178, "o-out", "Keep the answer, send outreach", "They don’t know the recommendations")
down(194, 262)
add(f'<text x="{CX + 8}" y="222" class="tl">No reason, or another framework</text>')
add(f'<text x="{CX + 8}" y="236" class="tl">(another framework: +1 point, a sign of use)</text>')
node(262, 44, "3", "Kind of example", None)
add(f'<text x="{NX + 150}" y="289" class="ts">sets which criteria count</text>')
down(306, 340)
node(340, 44, "4", "Recommendation categories?")
side(362, [362], "No")
outcome(342, "o-keep", "Keep the answer", "The populations can’t be told apart")
down(384, 420, "Yes")
node(420, 64, "5", "Score the evidence",
     ["Data 2 each · Practice 1 each", "Event 2 or 1 · Use 2 each (a sign of use)"])
side(452, [430, 478, 526])
outcome(410, "o-edit", "Edit and notify",
        f"Don’t know: {t['dk']}+ points · No: {t['no']}+ and a sign of use")
outcome(458, "o-al", "Recorded as aligned", f"{t['aligned_min']}+ points, below that bar")
outcome(506, "o-keep", "Keep the answer", f"Under {t['aligned_min']} points: too little evidence")
add('</svg>')

css = """/* decision tree diagram (alignment/review/tree.svg.html); each page maps --t-edit, --t-out, --t-al, --t-keep */
.tree { margin: 0 0 12px; }
.tree summary { cursor: pointer; color: var(--ink-2); font-size: var(--fs-s); width: max-content; }
.tree summary:focus-visible { outline: 2px solid var(--ink-2); outline-offset: 2px; }
.tree .tbox { overflow-x: auto; margin-top: 8px; }
.tree svg { display: block; width: 100%; min-width: 620px; max-width: 760px; height: auto; }
.tree .tn { fill: var(--panel-2); stroke: var(--line); }
.tree .tstart { fill: none; stroke: var(--ink-3); stroke-dasharray: 3 3; }
.tree .tq { fill: var(--ink); font: 600 12px "IBM Plex Sans", system-ui, sans-serif; }
.tree .tnum { fill: var(--ink-3); font-family: "IBM Plex Mono", monospace; font-weight: 500; }
.tree .ts { fill: var(--ink-3); font: 400 10.5px "IBM Plex Sans", system-ui, sans-serif; }
.tree .tl { fill: var(--ink-2); font: 400 10.5px "IBM Plex Sans", system-ui, sans-serif; }
.tree .ta { fill: none; stroke: var(--ink-3); stroke-width: 1.2; }
.tree .tah { fill: var(--ink-3); }
.tree .tob { fill: var(--panel-2); stroke: var(--line); }
.tree .tot { fill: var(--ink); font: 600 11.5px "IBM Plex Sans", system-ui, sans-serif; }
.tree .o-edit .tos { fill: var(--t-edit); } .tree .o-out .tos { fill: var(--t-out); }
.tree .o-al .tos { fill: var(--t-al); } .tree .o-keep .tos { fill: var(--t-keep); }
"""
(root / "alignment/review/tree.svg.html").write_text("\n".join(out) + "\n")
(root / "alignment/review/tree.css").write_text(css)
print("ok", len("\n".join(out)))
