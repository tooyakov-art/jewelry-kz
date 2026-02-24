import re
from pathlib import Path


ROOT = Path.cwd()
CERT_OLD_BASE = "/jewelry-kz/st-ones.ru/wp-content/uploads/2024/09/"
CERT_NEW_BASE = "/jewelry-kz/st-ones.ru/wp-content/uploads/client/"
DESIGN_FIXES_VERSION = "20260223-10"

IMG_CERT_1 = re.compile(
    r'<img\s+src="' + re.escape(CERT_OLD_BASE + "certificate1.png") + r'"\s+alt="[^"]*"\s*>'
)
IMG_CERT_2 = re.compile(
    r'<img\s+src="' + re.escape(CERT_OLD_BASE + "certificate2.png") + r'"\s+alt="[^"]*"\s*>'
)
IMG_CERT_3 = re.compile(
    r'<img\s+src="' + re.escape(CERT_OLD_BASE + "certificate3.png") + r'"\s+alt="[^"]*"\s*>'
)
DESIGN_FIXES_HREF = re.compile(r"design-fixes\.css(?:\?v=[^\"'>]+)?")


def replace_cert_images(text: str):
    changed = False
    counts = {"c1": 0, "c2": 0, "c3": 0}

    text, n1 = IMG_CERT_1.subn(
        f'<img src="{CERT_NEW_BASE}cert-gia.svg" alt="GIA">', text
    )
    if n1:
        changed = True
        counts["c1"] = n1

    text, n3 = IMG_CERT_3.subn(
        f'<img src="{CERT_NEW_BASE}cert-hrd.svg" alt="HRD">', text
    )
    if n3:
        changed = True
        counts["c3"] = n3

    # Old template usually has 2x certificate2 in one slider.
    # We map odd/even hits to IGI/GRS so each block matches homepage set.
    matches = list(IMG_CERT_2.finditer(text))
    if matches:
        changed = True
        counts["c2"] = len(matches)
        chunks = []
        pos = 0
        for i, m in enumerate(matches):
            chunks.append(text[pos:m.start()])
            if i % 2 == 0:
                chunks.append(f'<img src="{CERT_NEW_BASE}cert-igi.svg" alt="IGI">')
            else:
                chunks.append(f'<img src="{CERT_NEW_BASE}cert-grs.svg" alt="GRS">')
            pos = m.end()
        chunks.append(text[pos:])
        text = "".join(chunks)

    return text, changed, counts


def process_html_file(path: Path):
    try:
        raw = path.read_bytes()
    except OSError:
        return {
            "changed": False,
            "cert_changed": False,
            "href_changed": 0,
            "cert_counts": {"c1": 0, "c2": 0, "c3": 0},
        }

    text = raw.decode("latin1")
    original = text

    text, cert_changed, cert_counts = replace_cert_images(text)
    text, href_changed = DESIGN_FIXES_HREF.subn(
        f"design-fixes.css?v={DESIGN_FIXES_VERSION}", text
    )

    changed = cert_changed or href_changed > 0
    if changed and text != original:
        try:
            path.write_bytes(text.encode("latin1"))
        except OSError:
            return {
                "changed": False,
                "cert_changed": False,
                "href_changed": 0,
                "cert_counts": {"c1": 0, "c2": 0, "c3": 0},
            }

    return {
        "changed": changed and text != original,
        "cert_changed": cert_changed,
        "href_changed": href_changed,
        "cert_counts": cert_counts,
    }


def main():
    files_scanned = 0
    changed_files = 0
    cert_files = 0
    total_c1 = 0
    total_c2 = 0
    total_c3 = 0
    href_updates = 0

    for f in ROOT.rglob("*.html"):
        if f.is_symlink():
            continue
        files_scanned += 1
        result = process_html_file(f)
        if result["changed"]:
            changed_files += 1
        if result["cert_changed"]:
            cert_files += 1
            total_c1 += result["cert_counts"]["c1"]
            total_c2 += result["cert_counts"]["c2"]
            total_c3 += result["cert_counts"]["c3"]
        href_updates += result["href_changed"]

    print(f"HTML files scanned: {files_scanned}")
    print(f"HTML files changed: {changed_files}")
    print(f"Files with certificate updates: {cert_files}")
    print(f"certificate1 -> GIA replacements: {total_c1}")
    print(f"certificate2 -> IGI/GRS replacements: {total_c2}")
    print(f"certificate3 -> HRD replacements: {total_c3}")
    print(f"design-fixes.css cache-bust updates: {href_updates}")


if __name__ == "__main__":
    main()
