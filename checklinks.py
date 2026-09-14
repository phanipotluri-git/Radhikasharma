#!/usr/bin/env python3
"""Fail the build if dist/ contains a reference that doesn't resolve.

Catches the classic static-site regression: a page renamed in build.py while
a link to its old URL is left behind in src/pages/.
"""

import os
import re
import sys

DIST = "dist"


def main():
    if not os.path.isdir(DIST):
        sys.exit("dist/ not found — run build.py first")

    files = set()
    for root, _, names in os.walk(DIST):
        for n in names:
            files.add("/" + os.path.relpath(os.path.join(root, n), DIST))

    def resolves(href):
        href = href.split("#")[0].split("?")[0]
        if not href:
            return True
        return (href + "index.html" if href.endswith("/") else href) in files

    broken, checked = [], 0
    for root, _, names in os.walk(DIST):
        for n in names:
            if not n.endswith(".html"):
                continue
            path = os.path.join(root, n)
            html = open(path, encoding="utf-8").read()
            html = re.sub(r"<!--.*?-->", "", html, flags=re.S)   # ignore commented-out markup
            for href in re.findall(r'(?:href|src)="(/[^"]*)"', html):
                checked += 1
                if not resolves(href):
                    broken.append((os.path.relpath(path, DIST), href))

    leftovers = []
    for root, _, names in os.walk(DIST):
        for n in names:
            if n.endswith((".html", ".xml", ".txt", ".webmanifest")):
                text = open(os.path.join(root, n), encoding="utf-8").read()
                for marker in ("{{", 'href="#/'):
                    if marker in text:
                        leftovers.append((n, marker))

    print("checked %d internal references across %d pages"
          % (checked, sum(1 for f in files if f.endswith(".html"))))

    for where, href in sorted(set(broken)):
        print("BROKEN  %s -> %s" % (where, href))
    for where, marker in sorted(set(leftovers)):
        print("LEFTOVER %s contains %s" % (where, marker))

    if broken or leftovers:
        sys.exit("%d broken, %d leftover" % (len(set(broken)), len(set(leftovers))))
    print("all good")


if __name__ == "__main__":
    main()
