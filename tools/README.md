# Quiz JSON Exporters

For existing SATurnify HTML sources, install the parser dependency:

```sh
python3 -m pip install -r tools/requirements.txt
```

For scanned PDFs or images, install the local OCR engine:

```sh
python3 -m pip install -r tools/requirements-ocr.txt
```

Pix2Text downloads its open-source OCR/layout/math models on first run. The initial setup may take a while; recognition runs locally afterward and does not require an API key.

Export a verbal question bank:

```sh
python3 tools/verbal_to_json.py WIC_QB_EASY.html
```

Export math questions:

```sh
python3 tools/math_to_json.py ORXAN_1.html
```

Input files do not need to be inside this project. Pass an absolute path and quote paths that contain spaces:

```sh
python3 tools/verbal_to_json.py "/Users/me/Downloads/Verbal Quiz.html" -o "/Users/me/Downloads/Verbal Quiz.json"
python3 tools/math_to_json.py "/Users/me/Desktop/Math Quiz.html" -o "/Users/me/Desktop/Math Quiz.json"
```

Each command writes a sibling file named `<source>.<subject>.json` unless `-o` specifies another path. Multiple input files can be passed together; they are written beside their sources. In addition to SATurnify HTML, both commands accept scanned `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff`, and `.bmp` files. DOCX is not supported.

For a 98-question `ELITEX*.html` test, verbal export defaults to source questions 1-54 and math export to 55-98. Use `--start N --end N` to select another inclusive range, or `--all-questions` to disable this split.

The JSON includes normalized question, passage, option, answer, and explanation fields plus the untouched `sourceData` object. Rich text, HTML emphasis, underline tags, LaTeX/MathJax source, Markdown tables, and inline image markup stay as strings. Referenced local images are copied beside the JSON into a `<output>.assets` directory and listed in each question's `media` field; data and remote URLs remain unchanged.

For OCR imports, question boundaries and A–H options are detected from the recognized Markdown. `answer` and `explanation` remain `null` instead of being guessed. The original scan, OCR Markdown, and recognized image assets are retained under `<output>.assets`; review the JSON before importing it as a quiz.