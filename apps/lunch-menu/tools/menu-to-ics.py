#!/usr/bin/env python3
"""Turn the district's monthly menu (.docx, the calendar-grid layout food service
hands out) into an .ics file with one all-day event per school day, ready to
import into a Google Calendar for the Lunch Menu app.

  python3 menu-to-ics.py lunch_nov_26.docx            -> lunch_nov_26.ics
  python3 menu-to-ics.py breakfast_nov_26.docx -o breakfast-2026-11.ics
  python3 menu-to-ics.py lunch_nov_26.docx --check    (only print what it found)

Event title = the main dish, description = the sides, one per line, as the app
expects. Days whose cell holds only a picture (holidays, conference days) get no
event. Needs python-docx (pip install python-docx).
"""
import argparse
import re
import sys
from datetime import date, datetime, timezone

import docx
from docx.table import _Cell

MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
          'september', 'october', 'november', 'december']
WEEKDAYS = ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')


def placed_cells(row):
    """(first grid column, cell) for each cell in the row. Matching by column
    keeps a day's number and the meal under it together, even when a picture
    sits in a cell of its own next to the meal."""
    tr = row._tr
    col = getattr(tr, 'grid_before', 0) or 0
    out = []
    for tc in tr.tc_lst:
        out.append((col, _Cell(tc, row._parent)))
        col += tc.grid_span
    return out


def cell_lines(c):
    lines = []
    for p in c.paragraphs:
        for t in p.text.split('\n'):
            t = re.sub(r'(?<=[A-Za-z])\*(?=[A-Za-z])', ' *', t)   # or*Veggie  -> or *Veggie
            t = re.sub(r'(\*[^*]+\*)(?=[A-Za-z])', r'\1 ', t)       # *Nuggets*Oven -> *Nuggets* Oven
            t = re.sub(r'\s+', ' ', t).strip()
            if t:
                lines.append(t)
    return lines


def find_month(d):
    text = ' '.join(c.text for t in d.tables for r in t.rows for _, c in placed_cells(r))
    m = re.search(r'(' + '|'.join(MONTHS) + r')\s+(\d{4})', text, re.I)
    if not m:
        sys.exit('Could not find the month and year (e.g. "November 2026") in the document.')
    return MONTHS.index(m.group(1).lower()) + 1, int(m.group(2))


def split_meal(lines):
    """The main dish ends at the last "with" (the sides follow it); without one,
    after the vegetarian choice the menu marks with *asterisks*; otherwise the
    first line is the dish."""
    text = re.sub(r'\s+', ' ', ' '.join(lines)).strip()
    withs = list(re.finditer(r'\s(?:with|With|WITH)\s', text))
    if withs:
        title, rest = text[:withs[-1].start()], text[withs[-1].end():]
    else:
        stars = list(re.finditer(r'\*[^*]+\*', text))
        if stars:
            title, rest = text[:stars[-1].end()], text[stars[-1].end():]
        else:
            title, rest = lines[0], ' '.join(lines[1:])
    title = re.sub(r'\s+', ' ', title.replace('*', '')).strip(' ,')
    rest = re.sub(r'\s+', ' ', rest.replace('*', '')).strip(' ,')
    sides = [x.strip() for x in rest.split(',') if x.strip()]
    # "Baked Fries and Assorted Fruit" -> two sides (only the last item, so
    # "Bagel and Cream Cheese" style names elsewhere stay whole)
    if sides and re.search(r'\sand\s', sides[-1]) and '/' not in sides[-1]:
        sides[-1:] = [x.strip() for x in re.split(r'\s+and\s+', sides[-1], maxsplit=1)]
    sides = [re.sub(r'^and\s+', '', x) for x in sides]
    return title, [x for x in sides if x]


def parse(path):
    d = docx.Document(path)
    month, year = find_month(d)
    found = {}
    for t in d.tables:
        rows = t.rows
        for i, row in enumerate(rows):
            head = placed_cells(row)
            starts = [a for a, c in head if any(w in c.text.lower() for w in WEEKDAYS)]
            if not starts or i + 1 >= len(rows):
                continue
            # Each weekday name opens that day's columns; its date number sits in them.
            spans = [(a, starts[k + 1] - 1 if k + 1 < len(starts) else 10 ** 6) for k, a in enumerate(starts)]
            numbers = {}
            for a, c in head:
                if re.fullmatch(r'\d{1,2}', c.text.strip()):
                    for k, (s0, s1) in enumerate(spans):
                        if s0 <= a <= s1:
                            numbers[k] = int(c.text.strip())
            for a, c in placed_cells(rows[i + 1]):
                lines = cell_lines(c)
                if not lines:
                    continue  # only a picture: holiday, conference day or decoration
                for k, (s0, s1) in enumerate(spans):
                    if k in numbers and s0 <= a <= s1:
                        found.setdefault(date(year, month, numbers[k]), []).extend(lines)
    return year, month, {day: split_meal(lines) for day, lines in found.items()}


def esc(s):
    return s.replace('\\', '\\\\').replace(';', '\\;').replace(',', '\\,').replace('\n', '\\n')


def ics(days, name):
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//signage-apps//menu-to-ics//EN',
           'CALSCALE:GREGORIAN', 'X-WR-CALNAME:' + esc(name)]
    for day in sorted(days):
        title, sides = days[day]
        nxt = date.fromordinal(day.toordinal() + 1)
        out += ['BEGIN:VEVENT',
                'UID:' + re.sub(r'[^a-z]', '', name.lower()) + f'-{day:%Y%m%d}@signage-apps',
                'DTSTAMP:' + stamp,
                f'DTSTART;VALUE=DATE:{day:%Y%m%d}',
                f'DTEND;VALUE=DATE:{nxt:%Y%m%d}',
                'SUMMARY:' + esc(title)]
        if sides:
            out.append('DESCRIPTION:' + esc('\n'.join(sides)))
        out += ['TRANSP:TRANSPARENT', 'END:VEVENT']
    out.append('END:VCALENDAR')
    return '\r\n'.join(out) + '\r\n'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('docx')
    ap.add_argument('-o', '--out')
    ap.add_argument('--name', help='calendar name (default: Breakfast or Lunch, from the file name)')
    ap.add_argument('--check', action='store_true', help='only print what was found')
    a = ap.parse_args()
    year, month, days = parse(a.docx)
    name = a.name or ('Breakfast' if 'breakfast' in a.docx.lower() else 'Lunch')
    for day in sorted(days):
        title, sides = days[day]
        print(f'{day:%a %b %d}  {title}' + ('   |  ' + '; '.join(sides) if sides else ''))
    print(f'{len(days)} days found for {MONTHS[month - 1].title()} {year}')
    if not a.check:
        out = a.out or re.sub(r'\.docx$', '', a.docx, flags=re.I) + '.ics'
        with open(out, 'w', newline='') as f:
            f.write(ics(days, name))
        print('wrote', out)


if __name__ == '__main__':
    main()
