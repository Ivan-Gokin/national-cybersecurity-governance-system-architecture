# Архітектура національної системи кібербезпеки України / National cybersecurity governance system architecture

[Українською](#українською) | [English](#english)

## Українською

Відкрите представлення національної системи кібербезпеки України: органи і їхні підрозділи, функції (ролі) з правовими підставами, мандати, типізовані зв'язки, класи організацій, на які спрямовано вимоги, і типові органи, яких у системі бракує. Одна модель — багато поглядів: фахівця організації, органу влади, юриста, аналітика, кризового реагування, міжнародного партнера.

**Статус: прототип.** Дані зібрано з відкритих актів і вторинних джерел. Ролі основних суб'єктів, звітування, нагляд і пов'язані функції звірено з текстами законів 2163-VIII і 3475-IV (редакції з урахуванням 4336-IX), законів про СБУ, Національну поліцію і розвідку та Положення про НКЦК станом на 30.10.2026 — у таких рядках `confidence = high` і стоїть `last_verified`; решта ще чекає звірки. Сайт закритий від пошукових систем, на кожній сторінці — банер.

### Будова

Три шари тримаються окремо:

1. **Представлення** — `data/*.csv`: суб'єкти (`actors`), ролі (`roles`), зв'язки (`links`), мандати, шлях інциденту, каталог типових органів (`expected_types`), карта функцій (`capabilities`, `realizations`), визнані рамки (`frameworks`, `framework_items`: NCAF 2.0 як хребет, мандати Клімбурґа, NIST CSF 2.0, ОТМ), драйвери і їхній вплив (`drivers`, `influences`: чому система така, окрім правової підстави), запитання, на які карта має відповісти, за Захманом (`questions`: з них будуються погляди й таблиця в «Методиці»), вторинні джерела (`refs`), довідники (`vocab.csv`). Схему всіх таблиць визначено один раз у `scripts/mapdata.py`: з неї перевіряються дані, збирається сайт і будується сторінка «Модель даних». Суб'єкти, ролі й зв'язки мають дати (`valid_from`, `valid_to`), тож карту можна читати станом на будь-яку дату. Актів окремо немає: роль і зв'язок посилаються на ідентифікатор із реєстру [GRC-фундаменту](https://github.com/Ivan-Gokin/grc-foundation-ua) (`ua-law-2163-viii`).
2. **Інструменти** — `scripts/` (перевірка, збирання) і `assets/js/core.js` (шар запитів і автоматичні перевірки: розподіл обов'язків, концентрація функцій, прогалини).
3. **Застосування** — сайт: будинок системи (рівень 0), вигляди (рівень 1, зокрема карта функцій і шкала часу), картки органу, класу організацій, функції й акта (рівень 2), погляди як входи.

Інше:

- `vendor/register/` — закріплена копія реєстру актів GRC-фундаменту і `lock.json` з комітом. Оновлення: `python3 scripts/sync_register.py --ref main`; зміна версії видна в diff.
- `assets/js/` — ES-модулі без залежностей: `core.js` (дані, запити, перевірки), `ui.js`, `home.js` (будинок, погляди), `views.js`, `cards.js`, `capmap.js` (функції, час), `model.js` (рамки, модель даних), `analysis.js`, рядки — `i18n.js`; тексти сторінок — `content/*.md`.
- `assets/css/site.css`, `fonts.css`, `assets/fonts/` — дизайн-система «Іван Гокін» v2 без змін, як у GRC-фундаменті; власні компоненти — `assets/css/map.css`.

### Супровід

- **Перевірка даних:** `python3 scripts/validate.py --stats` (лише стандартна бібліотека Python). Помилки — биті ідентифікатори, невідомі значення, акти, яких немає в реєстрі, сектори, яких немає в GRC-фундаменті; попередження — рядки, які варто переглянути.
- **Локальний перегляд:** `python3 scripts/build.py && python3 -m http.server 8000 -d _site`, далі http://localhost:8000. Збирання додає `data/graph.json` (усе, що читає сайт) і ZIP з таблицями.
- **Публікація.** Кожна зміна в `main` перевіряється, збирається й публікується на GitHub Pages (`.github/workflows/site.yml`, джерело Pages: GitHub Actions); pull request лише перевіряється.
- **Нові акти** додаються в реєстр GRC-фундаменту через pull request, а потім підтягуються сюди `sync_register.py`.
- **Режим прототипу.** Коли дані звірено, видаліть рядок `robots` з `index.html` і поставте `preview: false` у `assets/js/config.js`.
- **Межа відкритості.** Лише органи й посади з відкритих актів і офіційні публічні канали звернення. Жодних об'єктів інфраструктури, систем, мереж, адрес, контактів і прізвищ — ні в даних, ні в issues, ні в історії комітів: git не забуває видаленого.
- **Обсяг.** Лише постійні спроможності зі статутним мандатом. Тимчасові й добровільні формування на карту не потрапляють; кіберрезерв з'явиться як звичайний суб'єкт, коли матиме мандат.

### Ліцензія

Дані, тексти і код — [CC BY 4.0](LICENSE). Тексти українських офіційних документів не є об'єктом авторського права. Бібліотеки в `assets/vendor/` і шрифти в `assets/fonts/` мають власні ліцензії (MIT, SIL OFL). Довідник, а не юридична консультація.

## English

An open representation of Ukraine's national cybersecurity system: bodies and their units, functions (roles) with their legal bases, mandates, typed links, the classes of organisations the requirements address, and the expected institution types the system lacks. One model, many viewpoints: a practitioner in an organisation, an official, a lawyer, an analyst, crisis response, an international partner.

**Status: prototype.** Data compiled from open acts and secondary sources. The roles of the main actors, reporting, oversight and related functions were checked against the texts of Laws 2163-VIII and 3475-IV (as amended by 4336-IX), the laws on the SBU, the National Police and intelligence, and the NCCC Regulation on 30.10.2026 — those rows have `confidence = high` and a `last_verified` date; the rest await checking. The site is closed to search engines and shows a banner on every page.

### Structure

Three layers are kept apart:

1. **Representation** — `data/*.csv`: actors, roles, links, mandates, NCAF 2.0 objectives, the incident path, the catalogue of expected institution types, the capability map, the reference frameworks (NCAF 2.0 as the spine, Klimburg's mandates, NIST CSF 2.0, the OTM), drivers and their influence (`drivers`, `influences`: why the system is as it is, beyond the legal basis), the questions the map must answer, after Zachman (`questions`: the viewpoints and the table in Method are built from them), secondary sources, vocabularies. The schema of every table is defined once in `scripts/mapdata.py`, which checks the data, builds the site and draws the Data model page. Actors, roles and links carry dates, so the map can be read as of any date. There is no list of acts of its own: roles and links cite identifiers from the [GRC foundation](https://github.com/Ivan-Gokin/grc-foundation-ua) register.
2. **Tools** — `scripts/` (validation, build) and `assets/js/core.js` (the query layer and automated checks: segregation of duties, concentration of functions, gaps).
3. **Applications** — the site: the house of the system (level 0), views (level 1, including the capability map and the timeline), cards for a body, a class of organisations, a function and an act (level 2), with viewpoints as ways in.

`vendor/register/` holds a pinned copy of the register with `lock.json`; refresh with `python3 scripts/sync_register.py --ref main`.

### Maintenance

- **Check the data:** `python3 scripts/validate.py --stats` (Python standard library only).
- **Local preview:** `python3 scripts/build.py && python3 -m http.server 8000 -d _site`.
- **Publishing:** every change to `main` is checked, built and published to GitHub Pages; pull requests are only checked.
- **Prototype mode:** when the data is checked, delete the `robots` line in `index.html` and set `preview: false` in `assets/js/config.js`.
- **Openness boundary:** only bodies and positions from open acts and official public reporting channels. No infrastructure objects, systems, networks, addresses, contacts or names — not in the data, not in issues, not in commit history.
- **Scope:** permanent capabilities with a statutory mandate only.

### Licence

Data, texts and code are under [CC BY 4.0](LICENSE). Texts of Ukrainian official documents are not subject to copyright. Libraries in `assets/vendor/` and fonts in `assets/fonts/` keep their own licences (MIT, SIL OFL). A reference, not legal advice.
