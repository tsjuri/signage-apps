#!/usr/bin/env python3
"""Draws the four seasonal banner scenes (art/season-*.svg) for the Menu app.
Rolling hills in layers, a seasonal sky, trees and a few accents. Run it again
after changing colours or positions:  python3 tools/make-seasons.py"""
import math, os, random

W, H = 1920, 330
OUT = os.path.join(os.path.dirname(__file__), '..', 'art')


def ridge(base, amp, waves, seed, top=0):
    """A smooth hill line across the banner, closed down to the bottom."""
    r = random.Random(seed)
    ph = [r.uniform(0, 6.28) for _ in waves]
    pts = []
    for x in range(0, W + 41, 40):
        y = base - sum(a * math.sin(x / w + p) for (w, a), p in zip(waves, ph)) * amp
        pts.append((x, max(top, y)))
    d = f'M0 {H} L' + ' '.join(f'{x:.0f} {y:.1f}' for x, y in pts) + f' L{W} {H} Z'
    return d, pts


def y_at(pts, x):
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
    return pts[-1][1]


def evergreen(x, y, s, col, snow=None):
    out = [f'<rect x="{x - 3*s:.1f}" y="{y - 10*s:.1f}" width="{6*s:.1f}" height="{12*s:.1f}" fill="#6b4a2f"/>']
    for i, (w, h) in enumerate([(26, 22), (21, 20), (15, 18)]):
        by = y - 8*s - i * 14*s
        out.append(f'<path d="M{x - w*s:.1f} {by:.1f} L{x:.1f} {by - h*s*1.6:.1f} L{x + w*s:.1f} {by:.1f} Z" fill="{col}"/>')
        if snow:
            out.append(f'<path d="M{x - w*s*0.45:.1f} {by - h*s*0.9:.1f} L{x:.1f} {by - h*s*1.6:.1f} L{x + w*s*0.45:.1f} {by - h*s*0.9:.1f} Q{x:.1f} {by - h*s*0.75:.1f} {x - w*s*0.45:.1f} {by - h*s*0.9:.1f} Z" fill="{snow}"/>')
    return ''.join(out)


def round_tree(x, y, s, cols, dots=None, seed=0):
    r = random.Random(seed)
    out = [f'<path d="M{x - 4*s:.1f} {y:.1f} L{x - 2.5*s:.1f} {y - 34*s:.1f} L{x + 2.5*s:.1f} {y - 34*s:.1f} L{x + 4*s:.1f} {y:.1f} Z" fill="#7a5233"/>',
           f'<path d="M{x:.1f} {y - 26*s:.1f} l{-10*s:.1f} {-10*s:.1f} M{x:.1f} {y - 22*s:.1f} l{11*s:.1f} {-11*s:.1f}" stroke="#7a5233" stroke-width="{3*s:.1f}" stroke-linecap="round"/>']
    blobs = [(-14, -44, 16), (12, -46, 17), (0, -60, 18), (-20, -58, 12), (20, -60, 12)]
    for i, (dx, dy, rr) in enumerate(blobs):
        out.append(f'<circle cx="{x + dx*s:.1f}" cy="{y + dy*s:.1f}" r="{rr*s:.1f}" fill="{cols[i % len(cols)]}"/>')
    if dots:
        for _ in range(9):
            dx, dy = r.uniform(-28, 28), r.uniform(-72, -34)
            out.append(f'<circle cx="{x + dx*s:.1f}" cy="{y + dy*s:.1f}" r="{r.uniform(2.2, 3.6)*s:.1f}" fill="{dots}"/>')
    return ''.join(out)


def bare_tree(x, y, s, col):
    return (f'<g stroke="{col}" stroke-linecap="round" fill="none">'
            f'<path d="M{x} {y} L{x} {y - 50*s}" stroke-width="{5*s:.1f}"/>'
            f'<path d="M{x} {y - 30*s} l{-16*s} {-18*s} M{x} {y - 38*s} l{14*s} {-20*s} M{x} {y - 48*s} l{-8*s} {-16*s} M{x} {y - 50*s} l{6*s} {-14*s}" stroke-width="{3*s:.1f}"/></g>')


def leaf(x, y, s, rot, col):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 -12 C8 -8 10 2 0 12 C-10 2 -8 -8 0 -12Z" fill="{col}"/>'
            f'<path d="M0 -10 V12" stroke="#7a4a1f" stroke-width="1.2" opacity=".6"/></g>')


def flake(x, y, s, col):
    return (f'<g transform="translate({x} {y}) scale({s})" stroke="{col}" stroke-width="2" stroke-linecap="round" fill="none">'
            '<path d="M0 -10 V10 M-8.7 -5 L8.7 5 M-8.7 5 L8.7 -5 M0 -6 l-3 -3 M0 -6 l3 -3 M0 6 l-3 3 M0 6 l3 3"/></g>')


def flower(x, y, s, petal, mid='#f6c945'):
    p = ''.join(f'<circle cx="{6*math.cos(a):.1f}" cy="{6*math.sin(a):.1f}" r="5" fill="{petal}"/>' for a in [i * 2 * math.pi / 5 for i in range(5)])
    return f'<g transform="translate({x} {y}) scale({s})"><path d="M0 4 V22" stroke="#5aa04a" stroke-width="2"/>{p}<circle r="3.5" fill="{mid}"/></g>'


def butterfly(x, y, s, a, b):
    return (f'<g transform="translate({x} {y}) scale({s})"><path d="M0 0 C-14 -16 -24 -4 -12 4 C-20 12 -8 18 0 6Z" fill="{a}"/>'
            f'<path d="M0 0 C14 -16 24 -4 12 4 C20 12 8 18 0 6Z" fill="{b}"/><path d="M0 -6 V10" stroke="#3a2a2a" stroke-width="2.4" stroke-linecap="round"/></g>')


def bird(x, y, s, col):
    return f'<path transform="translate({x} {y}) scale({s})" d="M-14 0 Q-7 -8 0 0 Q7 -8 14 0" fill="none" stroke="{col}" stroke-width="2.4" stroke-linecap="round"/>'


def sun(x, y, r, col, ray):
    rays = ''.join(f'<path d="M{x + (r+8)*math.cos(a):.1f} {y + (r+8)*math.sin(a):.1f} L{x + (r+20)*math.cos(a):.1f} {y + (r+20)*math.sin(a):.1f}"/>' for a in [i * math.pi / 8 for i in range(16)])
    return f'<g stroke="{ray}" stroke-width="3" stroke-linecap="round">{rays}</g><circle cx="{x}" cy="{y}" r="{r}" fill="{col}"/>'


SEASONS = {
    'fall':   dict(sky=('#fff1e2', '#fde3c7'), far='#f6cf9c', mid='#efb06a', near='#e08a3c', ground='#c9622b', ground2='#a84e22'),
    'winter': dict(sky=('#eef5fa', '#d6e7f3'), far='#b3cde3', mid='#8fb2d1', near='#dbe8f3', ground='#f4f8fb', ground2='#c3d6e6'),
    'spring': dict(sky=('#fdf2f6', '#f9e1ea'), far='#efd2e2', mid='#c9e3b0', near='#a8d48a', ground='#86bf63', ground2='#6aa84f'),
    'summer': dict(sky=('#f6fbea', '#e4f3cf'), far='#cfe7a8', mid='#a6d36f', near='#7cbf48', ground='#5ea83a', ground2='#46902b'),
}


def scene(name, c):
    r = random.Random(name)
    far, _ = ridge(150, 1.5, [(170, 30), (90, 13), (47, 5)], seed=1)
    mid, _ = ridge(210, 1.4, [(140, 24), (70, 10), (35, 4)], seed=2)
    near, near_pts = ridge(262, 1.3, [(210, 16), (60, 6)], seed=3)
    body = [f'<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{c["sky"][0]}"/><stop offset="1" stop-color="{c["sky"][1]}"/></linearGradient></defs>',
            f'<rect width="{W}" height="{H}" fill="url(#sky)"/>']
    if name == 'summer':
        body.append(sun(1450, 75, 48, '#f8c63a', '#f6b73c'))
    if name == 'fall':
        body.append(sun(1450, 85, 42, '#f4a64a', '#f7c27a'))
    body += [f'<path d="{far}" fill="{c["far"]}"/>']
    if name == 'winter':  # snowy caps on the far hills
        body.append(f'<path d="{far}" fill="#ffffff" opacity=".45"/>')
    body += [f'<path d="{mid}" fill="{c["mid"]}"/>', f'<path d="{near}" fill="{c["near"]}"/>',
             f'<rect y="{H - 40}" width="{W}" height="40" fill="{c["ground"]}"/>',
             f'<rect y="{H - 16}" width="{W}" height="16" fill="{c["ground2"]}"/>']
    # trees along the near hill, skipping the middle (the title sits there)
    xs = [50, 190, 320, 450, 580, 700, 1240, 1360, 1480, 1610, 1740, 1870]
    for i, x in enumerate(xs):
        y = min(y_at(near_pts, x) + 40, H - 30)
        s = r.uniform(1.6, 2.3)
        if name == 'winter':
            body.append(evergreen(x, y, s, r.choice(['#2f6b5e', '#3b7d6c', '#285d52']), snow='#ffffff') if i % 3 else bare_tree(x, y, s, '#6f7f8c'))
        elif name == 'fall':
            body.append(round_tree(x, y, s, r.choice([['#e0702b', '#f0a03a'], ['#c0392b', '#e0702b'], ['#f0b43a', '#e08a2b']]), seed=i) if i % 4 else evergreen(x, y, s, '#4f7a3f'))
        elif name == 'spring':
            body.append(round_tree(x, y, s, ['#f4b8cf', '#f7cadb'], dots='#e8789c', seed=i) if i % 2 else round_tree(x, y, s, ['#9fd27a', '#b7df95'], seed=i))
        else:
            body.append(round_tree(x, y, s, ['#4f9d38', '#6cb94a', '#5aa83f'], seed=i) if i % 3 else evergreen(x, y, s, '#3f7f3a'))
    # accents
    if name == 'fall':
        for _ in range(22):
            body.append(leaf(r.uniform(20, W - 20), r.uniform(20, H - 90), r.uniform(1.4, 2.4), r.uniform(0, 360), r.choice(['#e0702b', '#c0392b', '#f0b43a', '#b5651d'])))
    if name == 'winter':
        for _ in range(30):
            body.append(flake(r.uniform(15, W - 15), r.uniform(12, H - 80), r.uniform(1.0, 2.2), r.choice(['#ffffff', '#b9d3e8'])))
    if name == 'spring':
        for _ in range(26):
            x = r.choice([r.uniform(20, 700), r.uniform(1220, W - 20)])
            body.append(flower(x, r.uniform(H - 62, H - 40), r.uniform(1.2, 1.7), r.choice(['#f28db2', '#f7c6d9', '#ffffff', '#c39be0'])))
        for x, y in [(480, 60), (1380, 90), (760, 120), (1700, 50)]:
            body.append(butterfly(x, y, r.uniform(1.4, 2.0), r.choice(['#f6a01a', '#8fc3ea']), r.choice(['#f6c945', '#b48be0'])))
    if name == 'summer':
        for x, y in [(420, 60), (470, 85), (1260, 50), (1320, 75), (1650, 100)]:
            body.append(bird(x, y, r.uniform(1.2, 1.8), '#5b6b4a'))
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMax slice">' + ''.join(body) + '</svg>\n'
    open(os.path.join(OUT, f'season-{name}.svg'), 'w').write(svg)


for n, c in SEASONS.items():
    scene(n, c)
print('wrote', ', '.join(f'season-{n}.svg' for n in SEASONS))
