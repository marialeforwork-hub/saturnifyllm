# All-in-One Quiz JSON Tool

For existing SATurnify HTML sources, install the parser dependency:

```sh
python3 -m pip install -r tools/requirements.txt
```

For scanned PDFs or images, install the local OCR engine:

```sh
python3 -m pip install -r tools/requirements-ocr.txt
```

Pix2Text downloads its open-source OCR/layout/math models on first run. The initial setup may take a while; recognition runs locally afterward and does not require an API key.

Run the unified tool on an existing HTML verbal bank:

```sh
python3 tools/quiz_to_json.py WIC_QB_EASY.html
```

Run it on a math bank or a scanned source:

```sh
python3 tools/quiz_to_json.py ORXAN_1.html
python3 tools/quiz_to_json.py "/Users/me/Downloads/Math Scan.pdf"
```

Input files do not need to be inside this project. Pass an absolute path and quote paths that contain spaces:

```sh
python3 tools/quiz_to_json.py "/Users/me/Downloads/Verbal Quiz.pdf" --subject verbal -o "/Users/me/Downloads/Verbal Quiz.json"
python3 tools/quiz_to_json.py "/Users/me/Desktop/Math Quiz.png" --subject math -o "/Users/me/Desktop/Math Quiz.json"
```

`--subject` accepts `auto` (default), `verbal`, `math`, or `mixed`. Auto-detection uses the filename; ambiguous scan filenames fall back to `mixed`, so specify `--subject` when known. A 98-question `ELITEX*.html` defaults to `mixed`; explicitly selecting verbal/math uses questions 1-54/55-98. Use `--start N --end N` to select another inclusive range, or `--all-questions` to disable that split.

Inputs may be SATurnify HTML or scanned `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.tif`, `.tiff`, and `.bmp` files. DOCX is not supported. Older `verbal_to_json.py` and `math_to_json.py` commands remain available as fixed-subject shortcuts.

The JSON includes normalized question, passage, option, answer, and explanation fields plus the untouched `sourceData` object. Rich text, HTML emphasis, underline tags, LaTeX/MathJax source, Markdown tables, and inline image markup stay as strings. Referenced local images are copied beside the JSON into a `<output>.assets` directory and listed in each question's `media` field; data and remote URLs remain unchanged.

For OCR imports, question boundaries and A–H options are detected from the recognized Markdown. `answer` and `explanation` remain `null` instead of being guessed. The original scan, OCR Markdown, and recognized image assets are retained under `<output>.assets`; review the JSON before importing it as a quiz.