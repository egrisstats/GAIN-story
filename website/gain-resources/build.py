"""Build the GAIN Resources Divi code module with a language switch on the Glossary and FAQ.

Input:  module_live_backup.html (the live code module, as published on egrisstats.org)
        faq_<Language>.txt      (text of the translated 2025 FAQ .docx files)
Output: module_multilingual.html (paste into the Divi "Fullwidth Code" module)
        preview.html             (local preview with the site fonts)

English stays the default. One language choice switches both sections, and links such as
#faq-fr or #glossary-ar open the page in that language (for the invitation emails).

FAQ: the web shows 8 of the 15 questions in the translated documents (the online-form
questions live in the PDF). WEB_TO_DOC maps the web numbering to the document numbering.
Glossary: question 16 of each translated document holds the glossary as 9 paragraphs, in the
same order in every language. GLOSSARY maps them onto the 6 terms on the web.
"""
import html
import json
import re
from datetime import date
from pathlib import Path

HERE = Path(__file__).parent
UPLOADS = "https://egrisstats.org/wp-content/uploads/"
WEB_TO_DOC = [1, 2, 3, 9, 10, 11, 12, 14]

# Glossary terms, in web order: (tag, paragraphs of FAQ question 16, title per language).
# Paragraphs 5 and 6 are "Current examples: ..." bullets; their lead-in is dropped.
GLOSSARY = [
    ("PRO01 / PRO01A", [0, 1], {"fr": "Exemple", "es": "Ejemplo", "ru": "Пример", "ar": "المثال"}),
    (None, [5], {"fr": "Exemple actuel", "es": "Ejemplo actual", "ru": "Текущий пример", "ar": "المثال الحالي"}),
    ("FPR", [6, 3], {"fr": "Exemple futur", "es": "Ejemplo futuro", "ru": "Будущий пример", "ar": "المثال المستقبلي"}),
    (None, [2], {"fr": "Partenariat", "es": "Asociación", "ru": "Партнерство", "ar": "الشراكة"}),
    ("PRO08", [7], {"fr": "Sources de données et outils", "es": "Fuentes de datos y herramientas",
                    "ru": "Источники данных и инструменты", "ar": "مصادر البيانات والأدوات"}),
    ("PRO19–20", [8], {"fr": "Défis", "es": "Desafíos", "ru": "Проблемы", "ar": "التحديات"}),
]

# code, docx name, endonym, dir, FAQ PDF file name in the WordPress media library, UI strings
LANGS = [
    ("fr", "French", "Français", "ltr", "EGRISS-GAIN-Survey_FAQs_French_2025.pdf", {
        "faq": {
            "label": "Aide",
            "title": "Questions fréquentes",
            "desc": "Questions pratiques sur le remplissage de l’enquête GAIN. Pour la terminologie, consultez le <a href=\"#glossary-fr\">glossaire</a> ci-dessus.",
        },
        "glossary": {
            "label": "Référence",
            "title": "Glossaire",
            "desc": "Termes clés utilisés dans l’enquête GAIN. Les définitions sont les mêmes pour tous les cycles de l’enquête.",
        },
        "pdf": "FAQ complète, y compris l’aide pour le formulaire en ligne",
        "search": "Rechercher des termes et définitions…",
        "terms": "termes",
        "none": "Aucun terme ne correspond à votre recherche.",
    }),
    ("es", "Spanish", "Español", "ltr", "EGRISS-GAIN-Survey_FAQs_Spanish_2025.pdf", {
        "faq": {
            "label": "Ayuda",
            "title": "Preguntas frecuentes",
            "desc": "Preguntas prácticas sobre cómo completar la encuesta GAIN. Para la terminología, consulte el <a href=\"#glossary-es\">glosario</a> más arriba.",
        },
        "glossary": {
            "label": "Referencia",
            "title": "Glosario",
            "desc": "Términos clave utilizados en la encuesta GAIN. Las definiciones son las mismas en todas las rondas de la encuesta.",
        },
        "pdf": "Preguntas frecuentes completas, incluida la ayuda con el formulario en línea",
        "search": "Buscar términos y definiciones…",
        "terms": "términos",
        "none": "Ningún término coincide con su búsqueda.",
    }),
    ("ru", "Russian", "Русский", "ltr", "EGRISS-GAIN-Survey_FAQs_Russian_2025.pdf", {
        "faq": {
            "label": "Помощь",
            "title": "Часто задаваемые вопросы",
            "desc": "Практические вопросы о заполнении опроса GAIN. Определения терминов см. в <a href=\"#glossary-ru\">глоссарии</a> выше.",
        },
        "glossary": {
            "label": "Справка",
            "title": "Глоссарий",
            "desc": "Ключевые термины, используемые в опросе GAIN. Определения одинаковы для всех раундов опроса.",
        },
        "pdf": "Полная версия вопросов и ответов, включая помощь с онлайн-формой",
        "search": "Поиск терминов и определений…",
        "terms": "терминов",
        "none": "Нет терминов, соответствующих запросу.",
    }),
    ("ar", "Arabic", "العربية", "rtl", "EGRISS-GAIN-Survey_FAQs_Arabic_2025.pdf", {
        "faq": {
            "label": "مساعدة",
            "title": "الأسئلة الشائعة",
            "desc": "أسئلة عملية حول إكمال استطلاع GAIN. للاطلاع على المصطلحات، راجع <a href=\"#glossary-ar\">المسرد</a> أعلاه.",
        },
        "glossary": {
            "label": "مرجع",
            "title": "المسرد",
            "desc": "المصطلحات الرئيسية المستخدمة في استطلاع GAIN. التعريفات ثابتة في جميع جولات الاستطلاع.",
        },
        "pdf": "الأسئلة الشائعة كاملة، بما في ذلك المساعدة في النموذج عبر الإنترنت",
        "search": "ابحث في المصطلحات والتعريفات…",
        "terms": "مصطلحات",
        "none": "لا توجد مصطلحات تطابق بحثك.",
    }),
]

CHEVRON = '<svg class="cr-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>'
DL_ICON = '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>'


def esc(s):
    return html.escape(s, quote=False)


def parse_doc(path):
    """Return {number: (question, [paragraphs])} from the docx text export."""
    qs, cur = {}, None
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        m = re.match(r"^(\d+)\.\s+(.*)$", line)
        if m:
            cur = int(m.group(1))
            qs[cur] = (m.group(2), [])
        elif cur and line and line != "]":
            qs[cur][1].append(line)
    return qs


def body(paras):
    return "\n".join(f"          <p>{esc(p)}</p>" for p in paras)


def faq_item(section, num, q, paras):
    return f"""
      <li class="cr-acc-item" data-section="{section}">
        <button class="cr-acc-trigger" aria-expanded="false">
<div class="cr-faq-row"><span class="cr-faq-num">{num:02d}</span><span class="cr-faq-q">{esc(q)}</span></div>
          {CHEVRON}
        </button>
        <div class="cr-acc-body">
{body(paras)}
        </div>
      </li>
"""


def glossary_item(section, title, tag, paras):
    tag_html = f'\n            <span class="cr-tag">{esc(tag)}</span>' if tag else ""
    return f"""
      <li class="cr-acc-item" data-section="{section}"
          data-term="{html.escape(title.lower())}">
        <button class="cr-acc-trigger" aria-expanded="false">
<div class="cr-term-row">
            <span class="cr-term-text">{esc(title)}</span>{tag_html}
          </div>
          {CHEVRON}
        </button>
        <div class="cr-acc-body">
{body(paras)}
        </div>
      </li>
"""


def glossary_paras(doc_paras, idx):
    out = []
    for i in idx:
        p = doc_paras[i]
        if i in (5, 6):  # "•  Exemples actuels : Les exemples actuels sont ..." -> drop bullet and lead-in
            p = p.split(":", 1)[1].strip()
        out.append(p)
    return out


def lang_buttons(section):
    btns = [f'        <button type="button" class="cr-lang-btn" role="tab" data-lang="en" lang="en" aria-selected="true">English</button>']
    btns += [f'        <button type="button" class="cr-lang-btn" role="tab" data-lang="{c}" lang="{c}" aria-selected="false">{name}</button>'
             for c, _, name, *_ in LANGS]
    return (f'    <div class="cr-lang-switch" role="tablist" aria-label="{section.capitalize()} language">\n'
            + "\n".join(btns) + "\n    </div>\n")


def wrap_head(head):
    """Wrap the section label, title and description so the script can swap their text."""
    head = head.replace('<span class="cr-section-label">', '<div class="cr-switch-head">\n    <span class="cr-section-label">', 1)
    return head.replace("</p>", "</p>\n    </div>", 1)


def pane(section, code, direction, ui, inner):
    attrs = " ".join(f'data-{k}="{html.escape(v)}"' for k, v in ui.items())
    return (f'    <div class="cr-lang-pane" id="{section}-{code}" data-lang="{code}" lang="{code}" dir="{direction}" {attrs} hidden>\n'
            f'{inner}\n    </div>')


def build_faq(faq, docs):
    list_start = faq.index('<ul class="cr-acc-list" id="cr-faq-list">')
    list_end = faq.index("</ul>", list_start) + len("</ul>")
    head, en_list = wrap_head(faq[:list_start]), faq[list_start:list_end]
    panes = [f'    <div class="cr-lang-pane" data-lang="en" lang="en">\n    {en_list}\n    </div>']
    for code, doc, _, direction, pdf, ui in LANGS:
        qs = docs[code]
        items = "".join(faq_item(f"faq-{code}", i + 1, *qs[n]) for i, n in enumerate(WEB_TO_DOC))
        inner = (f'      <ul class="cr-acc-list">\n{items}\n      </ul>\n'
                 f'      <a class="cr-faq-pdf" href="{UPLOADS}{pdf}" target="_blank" rel="noopener">{DL_ICON}{ui["pdf"]} (PDF)</a>')
        panes.append(pane("faq", code, direction, ui["faq"], inner))
    return head + lang_buttons("faq") + "\n" + "\n\n".join(panes) + "\n  </section>"


def build_glossary(gl, docs):
    # Language buttons go above the search box; the term list is split into one pane per language.
    search_at = gl.index('<div class="cr-search-wrap">')
    list_start = gl.index('<ul class="cr-acc-list" id="cr-glossary-list">')
    list_end = gl.index("</ul>", list_start) + len("</ul>")
    head = wrap_head(gl[:search_at]) + lang_buttons("glossary") + "\n    " + gl[search_at:list_start]
    head = head.replace("</strong> terms</p>", '</strong> <span id="cr-terms-word">terms</span></p>', 1)
    panes = [f'    <div class="cr-lang-pane" data-lang="en" lang="en">\n    {gl[list_start:list_end]}\n    </div>']
    for code, _, _, direction, _, ui in LANGS:
        doc_paras = docs[code][16][1]
        items = "".join(glossary_item(f"glossary-{code}", titles[code], tag, glossary_paras(doc_paras, idx))
                        for tag, idx, titles in GLOSSARY)
        meta = {**ui["glossary"], "search": ui["search"], "terms": ui["terms"], "none": ui["none"]}
        panes.append(pane("glossary", code, direction, meta, f'      <ul class="cr-acc-list">\n{items}\n      </ul>'))
    return head + "\n".join(panes) + "\n  </section>"


CSS = """
/* The theme's list styles otherwise add bullets and an indent to the accordion lists. */
.cr-root ul.cr-acc-list { list-style: none !important; padding-left: 0 !important; margin-left: 0 !important; }
.cr-root ul.cr-acc-list > li { list-style: none !important; }

/* ── Language switch (Glossary and FAQ) ── */
.cr-lang-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: -12px 0 28px;
}
.cr-lang-btn {
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: #3b71b9;
  background: #ffffff;
  border: 1px solid #cde3f7;
  border-radius: 100px;
  padding: 7px 16px;
  cursor: pointer;
  line-height: 1.3;
  transition: background .15s, border-color .15s, color .15s;
}
.cr-lang-btn:hover { border-color: #3b71b9; }
.cr-lang-btn[aria-selected="true"] {
  color: #ffffff;
  background: #14234c;
  border-color: #14234c;
}
.cr-lang-btn[lang="ar"] { font-size: 16px; }
.cr-lang-pane[hidden] { display: none; }
.cr-faq-pdf {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  font-size: 15px;
  font-weight: 600;
  color: #3b71b9;
  text-decoration: none;
}
.cr-faq-pdf:hover { text-decoration: underline; }
.cr-faq-pdf svg { width: 16px; height: 16px; flex-shrink: 0; }
.cr-lang-pane[dir="rtl"] .cr-acc-trigger { text-align: right; padding: 20px 24px 20px 60px; }
.cr-lang-pane[dir="rtl"] .cr-chevron { right: auto; left: 20px; }
.cr-lang-pane[dir="rtl"] .cr-acc-body { padding: 24px 24px 28px 60px; }
.cr-lang-pane[dir="rtl"] .cr-faq-q,
.cr-lang-pane[dir="rtl"] .cr-term-text,
.cr-lang-pane[dir="rtl"] .cr-acc-body,
.cr-switch-head[dir="rtl"] .cr-section-h2,
.cr-switch-head[dir="rtl"] .cr-section-desc { font-family: 'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif; }
.cr-lang-pane[dir="rtl"] .cr-faq-q,
.cr-lang-pane[dir="rtl"] .cr-term-text { font-size: 17px; }
.cr-search-wrap[dir="rtl"] .cr-search-icon { left: auto; right: 14px; }
.cr-search-wrap[dir="rtl"] #cr-search { padding: 13px 44px 13px 16px; font-family: 'IBM Plex Sans Arabic','IBM Plex Sans',sans-serif; }
@media (max-width: 600px) {
  .cr-lang-pane[dir="rtl"] .cr-acc-trigger { padding: 18px 18px 18px 52px; }
  .cr-lang-pane[dir="rtl"] .cr-acc-body { padding: 18px 18px 22px; }
}
"""

JS = """
  /* ── Language switch (Glossary and FAQ) ──
     English is the default. One choice switches both sections. Links such as
     #faq-fr or #glossary-ar open the page in that language (e.g. from the invitation emails). */
  var LANG_CODES = ['en', 'fr', 'es', 'ru', 'ar'];
  var switchSections = ['glossary', 'faq'].map(function (id) {
    var section = document.getElementById(id);
    var head = section.querySelector('.cr-switch-head');
    return {
      id: id,
      section: section,
      head: head,
      en: { label: head.children[0].innerHTML, title: head.children[1].innerHTML, desc: head.children[2].innerHTML },
      buttons: Array.from(section.querySelectorAll('.cr-lang-btn')),
      panes: Array.from(section.querySelectorAll('.cr-lang-pane'))
    };
  });
  var glossaryEn = {
    search: searchEl.getAttribute('placeholder'),
    terms: document.getElementById('cr-terms-word').textContent,
    none: noResEl.textContent
  };

  function setLang(code) {
    switchSections.forEach(function (s) {
      var pane = s.section.querySelector('.cr-lang-pane[data-lang="' + code + '"]');
      ['label', 'title', 'desc'].forEach(function (k, i) {
        s.head.children[i].innerHTML = code === 'en' ? s.en[k] : pane.getAttribute('data-' + k);
      });
      s.head.setAttribute('lang', code);
      s.head.setAttribute('dir', pane.getAttribute('dir') || 'ltr');
      s.buttons.forEach(function (b) {
        b.setAttribute('aria-selected', b.getAttribute('data-lang') === code ? 'true' : 'false');
      });
      s.panes.forEach(function (p) { p.hidden = p !== pane; });
      if (s.id === 'glossary') {
        var t = function (k) { return code === 'en' ? glossaryEn[k] : pane.getAttribute('data-' + k); };
        searchEl.setAttribute('placeholder', t('search'));
        searchEl.closest('.cr-search-wrap').setAttribute('dir', pane.getAttribute('dir') || 'ltr');
        document.getElementById('cr-terms-word').textContent = t('terms');
        noResEl.textContent = t('none');
        searchEl.value = '';
        searchEl.dispatchEvent(new Event('input'));
      }
    });
  }

  switchSections.forEach(function (s) {
    s.buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.getAttribute('data-lang');
        setLang(code);
        if (window.history && history.replaceState) {
          history.replaceState(null, '', code === 'en' ? '#' + s.id : '#' + s.id + '-' + code);
        }
      });
    });
  });

  function langFromHash() {
    var m = /^#(faq|glossary)(?:-([a-z]{2}))?$/.exec(window.location.hash);
    if (!m) return;
    if (m[2] && LANG_CODES.indexOf(m[2]) !== -1) setLang(m[2]);
    goToSection(m[1]);
  }
  window.addEventListener('hashchange', langFromHash);
  /* Run after the theme has finished laying out the page, so the scroll lands on the section. */
  if (document.readyState === 'complete') langFromHash();
  else window.addEventListener('load', function () { setTimeout(langFromHash, 50); });
"""

# Edits to the live glossary search so it searches only the language on screen.
SEARCH_EDITS = [
    ("""  var items    = Array.from(document.querySelectorAll('.cr-acc-item[data-section="glossary"]'));
""",
     """  var allItems = Array.from(document.querySelectorAll('.cr-acc-item[data-section^="glossary"]'));
  function visibleItems() {
    return allItems.filter(function (item) { var p = item.closest('.cr-lang-pane'); return !p || !p.hidden; });
  }
  var items    = visibleItems();
"""),
    ("""  items.forEach(function (item) {
    var termEl = item.querySelector('.cr-term-text');
    item.setAttribute('data-orig-term'""",
     """  allItems.forEach(function (item) {
    var termEl = item.querySelector('.cr-term-text');
    item.setAttribute('data-orig-term'"""),
    ("""    var q    = this.value.trim();
""",
     """    items    = visibleItems();
    var q    = this.value.trim();
"""),
]


def section(src, sid):
    start = src.index(f'<section class="cr-section" id="{sid}">')
    end = src.index("</section>", start) + len("</section>")
    return start, end


def build():
    src = (HERE / "module_live_backup.html").read_text(encoding="utf-8")
    docs = {code: parse_doc(HERE / f"faq_{doc}.txt") for code, doc, *_ in LANGS}

    s, e = section(src, "faq")
    src = src[:s] + build_faq(src[s:e], docs) + src[e:]
    s, e = section(src, "glossary")
    src = src[:s] + build_glossary(src[s:e], docs) + src[e:]

    src = src.replace("</style>", CSS + "</style>", 1)
    for old, new in SEARCH_EDITS:
        assert old in src, old
        src = src.replace(old, new, 1)
    end_iife = src.rindex("}());")
    src = src[:end_iife] + JS + "\n" + src[end_iife:]
    (HERE / "module_multilingual.html").write_text(src, encoding="utf-8")

    preview = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>GAIN Resources preview</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap">
<style>body{{margin:0;background:#fff}} .fake-header{{position:fixed;top:0;left:0;right:0;height:105px;background:#14234c;color:#fff;display:flex;align-items:center;padding:0 5%;z-index:1000;font:700 18px 'IBM Plex Sans',sans-serif}} main{{padding-top:105px}}</style>
</head><body><div class="fake-header">EGRISS (preview header)</div><main>
{src}
</main></body></html>"""
    (HERE / "preview.html").write_text(preview, encoding="utf-8")


PAGE = "https://egrisstats.org/implementation/gain-survey/resources/"


def js_string(text):
    """JSON-encode for an inline <script>, so "</script>" inside the module cannot end it."""
    return json.dumps(text, ensure_ascii=False).replace("</", "<\\/")


def build_kit():
    """One self-contained HTML file a colleague can download: steps, copy/download buttons, preview."""
    langs = [("en", "English")] + [(c, name) for c, _, name, *_ in LANGS]
    pdf_rows = "\n".join(f"  <tr><td>{name}</td><td><code>{pdf}</code></td></tr>" for _, _, name, _, pdf, _ in LANGS)
    link_rows = "\n".join(
        f'  <tr><td>{name}</td><td><code>{PAGE}#faq{"" if c == "en" else "-" + c}</code></td>'
        f'<td><code>{PAGE}#glossary{"" if c == "en" else "-" + c}</code></td></tr>' for c, name in langs)
    kit = (HERE / "kit_template.html").read_text(encoding="utf-8")
    for key, val in {
        "__BUILT__": date.today().strftime("%-d %B %Y"),
        "__PDF_ROWS__": pdf_rows,
        "__LINK_ROWS__": link_rows,
        "__MODULE_JSON__": js_string((HERE / "module_multilingual.html").read_text(encoding="utf-8")),
        "__LIVE_JSON__": js_string((HERE / "module_live_backup.html").read_text(encoding="utf-8")),
        "__PREVIEW_JSON__": js_string((HERE / "preview.html").read_text(encoding="utf-8")),
    }.items():
        kit = kit.replace(key, val)
    (HERE / "GAIN-Resources-page-update.html").write_text(kit, encoding="utf-8")


if __name__ == "__main__":
    build()
    build_kit()
