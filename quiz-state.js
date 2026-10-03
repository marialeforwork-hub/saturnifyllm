(function () {
    const notePrefix = `saturnify_note_${document.title || 'quiz'}`;
    const questionTimes = {};
    let activeQuestionIndex = -1;
    let activeQuestionStartedAt = 0;
    let printScrollY = null;
    let printScope = 'all';

    function getQuestionBlocks() {
        return [...document.querySelectorAll('.question-block, .question')];
    }

    function unwrapQuestionLayoutWrappers() {
        getQuestionBlocks().forEach(block => {
            let wrapper;
            do {
                wrapper = [...block.children].find(child =>
                    ['B', 'STRONG'].includes(child.tagName) &&
                    child.querySelector('.question-passage, .options')
                );
                if (wrapper) wrapper.replaceWith(...wrapper.childNodes);
            } while (wrapper);
        });
    }

    function getNavigatorButtons() {
        return [...document.querySelectorAll('[id^="nav_btn_"]')];
    }

    function getNavigatorButtonForBlock(block, index, buttons) {
        const match = String(block.id || '').match(/(?:question|q)[-_](\d+)$/i);
        return (match && document.getElementById(`nav_btn_${match[1]}`)) || buttons[index];
    }

    function hasAnswer(block) {
        return Boolean(
            block.querySelector('input[type="radio"]:checked') ||
            [...block.querySelectorAll('input[type="text"], input[type="number"]')]
                .some(input => input.value.trim() !== '')
        );
    }

    function syncNavigator() {
        const blocks = getQuestionBlocks();
        const buttons = getNavigatorButtons();

        blocks.forEach((block, index) => {
            const button = getNavigatorButtonForBlock(block, index, buttons);
            if (!button) return;

            const checkedInput = block.querySelector('input[type="radio"]:checked');
            const selectedLabel = checkedInput?.closest('label');
            const isCorrect = Boolean(
                selectedLabel?.classList.contains('correct-answer-label') ||
                block.querySelector('.correct-input')
            );
            const isWrong = Boolean(
                selectedLabel?.classList.contains('wrong-answer-label') ||
                block.querySelector('.wrong-input')
            );
            const answered = hasAnswer(block);

            button.classList.toggle('nav-correct', isCorrect);
            button.classList.toggle('nav-wrong', !isCorrect && isWrong);
            button.classList.toggle('nav-answered', !isCorrect && !isWrong && answered);
        });
    }

    function clearQuizVisualState() {
        getQuestionBlocks().forEach(block => {
            block.classList.remove('is-answered', 'answer-correct', 'answer-wrong', 'flagged-for-review');
            block.querySelectorAll('.correct-answer-label, .wrong-answer-label, .correct-input, .wrong-input')
                .forEach(element => element.classList.remove('correct-answer-label', 'wrong-answer-label', 'correct-input', 'wrong-input'));
            block.querySelectorAll('.answer-eliminated').forEach(element => element.classList.remove('answer-eliminated'));
            block.querySelectorAll('.saturnify-text-mark').forEach(mark => {
                mark.replaceWith(...mark.childNodes);
            });
            block.querySelectorAll('.question-annotation-canvas').forEach(canvas => {
                canvas.__saturnifyClearDrawing?.();
                canvas.classList.remove('is-drawing');
                canvas.classList.remove('is-erasing');
            });
            const drawButton = block.querySelector('.question-annotate-control');
            if (drawButton) {
                drawButton.classList.remove('is-active');
                drawButton.textContent = '✏️ Vẽ';
            }
            const eraserButton = block.querySelector('.question-eraser-control');
            if (eraserButton) {
                eraserButton.classList.remove('is-active');
                eraserButton.textContent = '🧼 Tẩy';
            }
        });

        getNavigatorButtons().forEach(button => {
            button.classList.remove('nav-answered', 'nav-correct', 'nav-wrong', 'is-answered', 'answer-correct', 'answer-wrong');
            button.querySelector('.question-bookmark')?.classList.remove('is-flagged');
        });
        syncNavigator();
    }

    function hasCheckedAnswers() {
        return getQuestionBlocks().some(block => block.querySelector(
            '.correct-answer-label, .wrong-answer-label, .correct-input, .wrong-input'
        ));
    }

    function preparePrintView() {
        if (printScrollY === null) printScrollY = window.scrollY;
        document.body.classList.add('quiz-print-mode');
        document.body.classList.toggle('quiz-print-current-only', printScope === 'current');
        const blocks = getQuestionBlocks();
        const currentBlock = document.querySelector('.question-block.qp-active') || blocks[activeQuestionIndex] || blocks[0];
        blocks.forEach(block => block.classList.toggle('print-current-question', block === currentBlock));
        const container = document.querySelector('.container');
        const quiz = document.getElementById('quiz');
        const stats = document.querySelector('.sticky-footer .stats');
        if (container && quiz && stats && !container.querySelector('.quiz-print-summary')) {
            const summary = document.createElement('div');
            summary.className = 'quiz-print-summary';
            summary.textContent = stats.innerText.replace(/\s*\|\s*/g, '  |  ').trim();
            container.insertBefore(summary, quiz);
        } else if (container && stats) {
            const summary = container.querySelector('.quiz-print-summary');
            if (summary) summary.textContent = stats.innerText.replace(/\s*\|\s*/g, '  |  ').trim();
        }

        getQuestionBlocks().forEach(block => {
            block.querySelector('.question-note-print')?.remove();
            const note = block.querySelector('.question-note-textarea')?.value.trim();
            if (!note) return;

            const notePrint = document.createElement('div');
            notePrint.className = 'question-note-print';
            notePrint.textContent = `Ghi chú: ${note}`;
            block.appendChild(notePrint);
        });

        document.querySelectorAll('.question-annotation-canvas').forEach(canvas => {
            canvas.classList.remove('is-drawing');
            canvas.__saturnifyResizeDrawing?.();
        });
        window.scrollTo(0, 0);
    }

    function cleanupPrintView() {
        document.body.classList.remove('quiz-print-mode', 'quiz-print-current-only');
        getQuestionBlocks().forEach(block => block.classList.remove('print-current-question'));
        printScope = 'all';
        document.querySelectorAll('.question-note-print').forEach(note => note.remove());
        document.querySelectorAll('.quiz-print-summary').forEach(summary => summary.remove());
        if (printScrollY !== null) {
            window.scrollTo(0, printScrollY);
            printScrollY = null;
        }
    }

    function createPdfExportControl() {
        if (document.querySelector('.quiz-export-pdf')) return;

        const button = document.createElement('button');
        button.className = 'quiz-export-pdf';
        button.type = 'button';
        button.textContent = '🖨 In / Lưu PDF';
        button.title = 'Chọn in câu hiện tại hoặc toàn bộ đề';
        button.hidden = !hasCheckedAnswers();

        const chooser = document.createElement('div');
        chooser.className = 'quiz-print-chooser';
        chooser.hidden = true;
        chooser.innerHTML = `
            <div class="quiz-print-chooser-card" role="dialog" aria-modal="true" aria-labelledby="quizPrintTitle">
                <h2 id="quizPrintTitle">Chọn nội dung cần in</h2>
                <p>Chọn in câu đang xem hoặc toàn bộ câu hỏi trong đề.</p>
                <div class="quiz-print-chooser-actions">
                    <button type="button" data-print-scope="current">In câu hiện tại</button>
                    <button type="button" data-print-scope="all">In toàn bộ đề</button>
                    <button type="button" data-print-cancel>Hủy</button>
                </div>
            </div>`;

        const closeChooser = () => {
            chooser.hidden = true;
            button.focus();
        };
        const printQuiz = scope => {
            printScope = scope;
            chooser.hidden = true;
            preparePrintView();
            window.print();
            window.setTimeout(cleanupPrintView, 1000);
        };
        button.addEventListener('click', () => {
            if (!hasCheckedAnswers()) return;
            chooser.hidden = false;
            chooser.querySelector('[data-print-scope="current"]').focus();
        });
        chooser.querySelector('[data-print-scope="current"]').addEventListener('click', () => printQuiz('current'));
        chooser.querySelector('[data-print-scope="all"]').addEventListener('click', () => printQuiz('all'));
        chooser.querySelector('[data-print-cancel]').addEventListener('click', closeChooser);
        chooser.addEventListener('click', event => { if (event.target === chooser) closeChooser(); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !chooser.hidden) closeChooser();
        });
        document.body.appendChild(chooser);
        document.body.appendChild(button);

        if (!window.__saturnifyPrintListenersReady) {
            window.addEventListener('beforeprint', preparePrintView);
            window.addEventListener('afterprint', cleanupPrintView);
            window.__saturnifyPrintListenersReady = true;
        }
    }

    function updatePdfExportControl() {
        const button = document.querySelector('.quiz-export-pdf');
        if (button) button.hidden = !hasCheckedAnswers();
    }

    const MARK_EXCLUDED = '.quiz-note-toolbar, .question-header, .qp-qbar, .question-annotation-canvas, .question-note-print, .quiz-highlight-toolbar, .question-markup-menu, .btn-eliminate-option, .question-note-panel, mjx-container, script, style';

    // Highlight spans must not become extra flex/grid items of an option label.
    function ensureInlineTextWrapper(textNode) {
        const parent = textNode.parentElement;
        if (!parent || parent.classList.contains('saturnify-option-text') || parent.classList.contains('saturnify-text-mark')) return;
        if (!/flex|grid/.test(getComputedStyle(parent).display)) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'saturnify-option-text';
        const children = [...parent.childNodes];
        const isLead = child => child.nodeType === Node.ELEMENT_NODE &&
            (child.matches('input') || (child.tagName === 'STRONG' && /^[A-D]\.?\s*$/.test(child.textContent)));
        const lastLead = children.reduce((last, child, index) => isLead(child) ? index : last, -1);
        const wrapped = children.slice(lastLead + 1).filter(child => !(child.nodeType === Node.ELEMENT_NODE && child.matches('button')));
        if (!wrapped.some(child => child.textContent.trim())) return;
        wrapped[0].before(wrapper);
        wrapped.forEach(child => wrapper.appendChild(child));
    }

    function isolateMark(textNode) {
        const mark = textNode.parentElement;
        if (!mark?.classList.contains('saturnify-text-mark')) return null;
        const nodes = [...mark.childNodes];
        const index = nodes.indexOf(textNode);
        if (index > 0) {
            const before = mark.cloneNode(false);
            nodes.slice(0, index).forEach(node => before.appendChild(node));
            mark.before(before);
        }
        if (index < nodes.length - 1) {
            const after = mark.cloneNode(false);
            nodes.slice(index + 1).forEach(node => after.appendChild(node));
            mark.after(after);
        }
        return mark;
    }

    function getRangeTextNodes(block, range) {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        const items = [];
        let node;
        while ((node = walker.nextNode())) {
            if (!node.textContent.length || node.parentElement?.closest(MARK_EXCLUDED) || !range.intersectsNode(node)) continue;
            const start = range.startContainer === node ? range.startOffset : 0;
            const end = range.endContainer === node ? range.endOffset : node.textContent.length;
            if (end > start) items.push({ node, start, end });
        }
        return items;
    }

    // action: { color?, underline?, strike?, remove? } applied only to the selected characters.
    function formatRange(block, range, action) {
        const items = getRangeTextNodes(block, range);
        if (!items.length) return;
        if (!action.remove) items.forEach(item => ensureInlineTextWrapper(item.node));

        items.reverse().forEach(({ node, start, end }) => {
            let selected = node;
            if (end < node.textContent.length) node.splitText(end);
            if (start > 0) selected = node.splitText(start);

            let mark = isolateMark(selected);
            if (action.remove) {
                if (mark) mark.replaceWith(selected);
                return;
            }
            if (!mark) {
                mark = document.createElement('span');
                mark.className = 'saturnify-text-mark';
                selected.parentNode.replaceChild(mark, selected);
                mark.appendChild(selected);
            }
            if (action.color) mark.style.backgroundColor = action.color;
            if (action.underline) mark.classList.add('saturnify-underline');
            if (action.strike) mark.classList.add('saturnify-strike');
        });
    }

    function wrapRangeTextNodes(block, range, className, color = '') {
        formatRange(block, range, {
            color,
            underline: className.includes('saturnify-underline'),
            strike: className.includes('saturnify-strike')
        });
    }

    function getSelectionRange(block) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
        const range = selection.getRangeAt(0).cloneRange();
        const root = range.commonAncestorContainer;
        const element = root.nodeType === Node.ELEMENT_NODE ? root : root.parentElement;
        const owner = block || element?.closest('.question-block, .question');
        if (!owner || !owner.contains(range.commonAncestorContainer) || element?.closest('textarea, input, .quiz-note-toolbar, .qp-qbar, .question-header')) return null;
        return { range, block: owner };
    }

    const markHistory = new WeakMap();

    function snapshotMarks(block) {
        return [...block.querySelectorAll('.saturnify-text-mark')].map(mark => {
            const first = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = first.nextNode())) nodes.push(n);
            if (!nodes.length) return null;
            const start = getTextOffset(block, nodes[0], 0);
            const end = getTextOffset(block, nodes[nodes.length - 1], nodes[nodes.length - 1].textContent.length);
            return start === null || end === null ? null : {
                start, end,
                color: mark.style.backgroundColor || '',
                underline: mark.classList.contains('saturnify-underline'),
                strike: mark.classList.contains('saturnify-strike')
            };
        }).filter(Boolean);
    }

    function pushMarkHistory(block) {
        const stack = markHistory.get(block) || [];
        stack.push(snapshotMarks(block));
        if (stack.length > 50) stack.shift();
        markHistory.set(block, stack);
        block.__saturnifyLastEdit = 'mark';
    }

    function undoTextMarks(block) {
        const stack = markHistory.get(block);
        if (!stack?.length) return false;
        const saved = stack.pop();
        clearTextMarks(block);
        saved.forEach(mark => restoreTextMark(block, mark));
        window.getSelection()?.removeAllRanges();
        return true;
    }

    function applySelectionFormat(block, action) {
        const selected = getSelectionRange(block);
        if (!selected) return false;
        pushMarkHistory(selected.block);
        formatRange(selected.block, selected.range, action);
        window.getSelection().removeAllRanges();
        return true;
    }

    function applyTextMark(block, markType, color) {
        const action = markType === 'underline' ? { underline: true }
            : markType === 'strike' ? { strike: true }
            : { color };
        applySelectionFormat(block, action);
    }

    function removeSelectedMarks(block) {
        applySelectionFormat(block, { remove: true });
    }

    function createSelectionToolbar() {
        if (document.querySelector('.saturnify-selection-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'saturnify-selection-toolbar';
        toolbar.hidden = true;
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-label', 'Công cụ highlight văn bản đã chọn');

        const addButton = (className, text, label, action, color) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = className;
            button.textContent = text;
            button.title = label;
            button.setAttribute('aria-label', label);
            if (color) button.style.backgroundColor = color;
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', () => {
                applySelectionFormat(null, action);
                hide();
            });
            toolbar.appendChild(button);
        };

        [['#fff3a6', 'Highlight vàng'], ['#d9f3df', 'Highlight xanh lá'], ['#dbeafe', 'Highlight xanh dương'], ['#ffdce5', 'Highlight hồng']]
            .forEach(([color, label]) => addButton('question-highlight-color', '', label, { color }, color));
        addButton('saturnify-sel-underline', 'U', 'Gạch chân đoạn đã chọn', { underline: true });
        addButton('saturnify-sel-strike', 'S', 'Gạch ngang chữ đã chọn', { strike: true });
        addButton('saturnify-sel-remove', '🧽', 'Tẩy highlight chỉ ở đoạn đã chọn', { remove: true });
        const undoSel = document.createElement('button');
        undoSel.type = 'button';
        undoSel.className = 'saturnify-sel-undo';
        undoSel.textContent = '↩️';
        undoSel.title = 'Hoàn tác highlight vừa làm';
        undoSel.setAttribute('aria-label', 'Hoàn tác highlight vừa làm');
        undoSel.addEventListener('mousedown', event => event.preventDefault());
        undoSel.addEventListener('click', () => {
            const selected = getSelectionRange(null);
            if (selected) undoTextMarks(selected.block);
            hide();
        });
        toolbar.appendChild(undoSel);
        document.body.appendChild(toolbar);

        function hide() { toolbar.hidden = true; }
        function show() {
            const selected = getSelectionRange(null);
            if (!selected) { hide(); return; }
            const rects = selected.range.getClientRects();
            const rect = rects.length ? selected.range.getBoundingClientRect() : null;
            if (!rect || (!rect.width && !rect.height)) { hide(); return; }

            toolbar.hidden = false;
            const margin = 8;
            const topLimit = (document.querySelector('.qp-header')?.getBoundingClientRect().bottom || 0) + margin;
            const bottomLimit = (document.querySelector('.qp-footer')?.getBoundingClientRect().top || window.innerHeight) - margin;
            const width = toolbar.offsetWidth;
            const height = toolbar.offsetHeight;
            let top = rect.top - height - margin;
            if (top < topLimit) top = rect.bottom + margin;
            top = Math.max(topLimit, Math.min(top, bottomLimit - height));
            const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - margin));
            toolbar.style.left = `${left}px`;
            toolbar.style.top = `${top}px`;
        }

        let pointerDown = false;
        let timer;
        const schedule = delay => {
            window.clearTimeout(timer);
            timer = window.setTimeout(show, delay);
        };
        document.addEventListener('pointerdown', event => {
            if (toolbar.contains(event.target)) return;
            pointerDown = true;
            hide();
        }, true);
        document.addEventListener('pointerup', event => {
            if (toolbar.contains(event.target)) return;
            pointerDown = false;
            schedule(10);
        }, true);
        document.addEventListener('keyup', event => { if (event.shiftKey || event.key.startsWith('Arrow')) schedule(10); });
        document.addEventListener('selectionchange', () => {
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) { hide(); return; }
            if (!pointerDown) schedule(350);
        });
        document.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        window.__saturnifyHideSelectionToolbar = hide;
    }

    function clearTextMarks(block) {
        block.querySelectorAll('.saturnify-text-mark').forEach(mark => {
            mark.replaceWith(...mark.childNodes);
        });
    }

    function getSelectableTextNodes(block) {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.parentElement?.closest('.quiz-note-toolbar, .question-header, .question-annotation-canvas, .question-note-print')) continue;
            nodes.push(node);
        }
        return nodes;
    }

    function getTextOffset(block, targetNode, targetOffset) {
        let total = 0;
        for (const node of getSelectableTextNodes(block)) {
            if (node === targetNode) return total + targetOffset;
            total += node.textContent.length;
        }
        return null;
    }

    function getTextPoint(block, targetOffset) {
        let remaining = targetOffset;
        const nodes = getSelectableTextNodes(block);
        for (const node of nodes) {
            if (remaining <= node.textContent.length) return { node, offset: remaining };
            remaining -= node.textContent.length;
        }
        const last = nodes[nodes.length - 1];
        return last ? { node: last, offset: last.textContent.length } : null;
    }

    function restoreTextMark(block, savedMark) {
        const start = getTextPoint(block, savedMark.start);
        const end = getTextPoint(block, savedMark.end);
        if (!start || !end || savedMark.end <= savedMark.start) return;

        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset);
        wrapRangeTextNodes(
            block,
            range,
            `saturnify-text-mark ${savedMark.underline ? 'saturnify-underline' : ''} ${savedMark.strike ? 'saturnify-strike' : ''}`,
            savedMark.color || ''
        );
    }

    function serializeAnnotations() {
        return getQuestionBlocks().reduce((result, block) => {
            const questionId = block.id || `question-${result.length + 1}`;
            const marks = [...block.querySelectorAll('.saturnify-text-mark')].map(mark => {
                const walker = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
                const markTextNodes = [];
                let textNode;
                while ((textNode = walker.nextNode())) markTextNodes.push(textNode);
                if (!markTextNodes.length) return null;
                const firstTextNode = markTextNodes[0];
                const lastTextNode = markTextNodes[markTextNodes.length - 1];
                const start = getTextOffset(block, firstTextNode, 0);
                const end = getTextOffset(block, lastTextNode, lastTextNode.textContent.length);
                return start === null || end === null ? null : {
                    start,
                    end,
                    color: mark.style.backgroundColor || '',
                    underline: mark.classList.contains('saturnify-underline'),
                    strike: mark.classList.contains('saturnify-strike')
                };
            }).filter(Boolean);

            const canvas = block.querySelector('.question-annotation-canvas');
            const state = canvas?.__saturnifyDrawingState;
            const width = Math.max(1, block.clientWidth);
            const height = Math.max(1, block.scrollHeight);
            const strokes = (state?.strokes || []).map(stroke => {
                const isLegacyStroke = Array.isArray(stroke);
                const points = isLegacyStroke ? stroke : stroke.points;
                return {
                    mode: isLegacyStroke ? 'draw' : stroke.mode,
                    color: isLegacyStroke ? '#d94f5c' : stroke.color || '#d94f5c',
                    width: isLegacyStroke ? 3 : Number(stroke.width) || (stroke.mode === 'erase' ? 18 : 3),
                    points: points.map(point => ({ x: point.x / width, y: point.y / height }))
                };
            });

            result[questionId] = {
                marks,
                strokes,
                drawingStyle: state ? {
                    color: state.drawColor,
                    size: state.drawSize,
                    eraserSize: state.eraserSize
                } : null
            };
            return result;
        }, {});
    }

    function restoreAnnotations(savedAnnotations) {
        if (!savedAnnotations || typeof savedAnnotations !== 'object') return;
        getQuestionBlocks().forEach((block, index) => {
            const questionId = block.id || `question-${index + 1}`;
            const saved = savedAnnotations[questionId];
            if (!saved) return;

            (saved.marks || []).forEach(mark => restoreTextMark(block, mark));
            const canvas = block.querySelector('.question-annotation-canvas');
            if (canvas && typeof canvas.__saturnifySetDrawingStrokes === 'function') {
                canvas.__saturnifySetDrawingStrokes(saved.strokes || [], saved.drawingStyle);
            }
        });
    }

    window.__saturnifySerializeAnnotations = serializeAnnotations;
    window.__saturnifyRestoreAnnotations = restoreAnnotations;

    function setupAnnotationCanvas(block, drawButton) {
        let canvas = block.querySelector('.question-annotation-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'question-annotation-canvas';
            block.appendChild(canvas);
        }

        if (!canvas.__saturnifyDrawingState) {
            canvas.__saturnifyDrawingState = {
                strokes: [],
                currentStroke: null,
                drawColor: '#d94f5c',
                drawSize: 3,
                eraserSize: 18
            };
        }
        const state = canvas.__saturnifyDrawingState;

        const drawStroke = (context, points) => {
            if (!points.length) return;
            context.beginPath();
            context.moveTo(points[0].x, points[0].y);
            points.slice(1).forEach(point => context.lineTo(point.x, point.y));
            if (points.length === 1) context.lineTo(points[0].x + .1, points[0].y + .1);
            context.stroke();
        };

        const redrawCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            const context = canvas.getContext('2d');
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            const renderStroke = stroke => {
                const legacyStroke = Array.isArray(stroke);
                const mode = legacyStroke ? 'draw' : stroke.mode;
                const points = legacyStroke ? stroke : stroke.points;
                context.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
                context.lineWidth = Number(stroke.width) || (mode === 'erase' ? state.eraserSize : state.drawSize);
                context.strokeStyle = mode === 'erase' ? '#000' : stroke.color || state.drawColor;
                drawStroke(context, points);
            };
            state.strokes.forEach(renderStroke);
            if (state.currentStroke) renderStroke(state.currentStroke);
            context.globalCompositeOperation = 'source-over';
        };

        canvas.__saturnifyUndoDrawing = () => {
            state.strokes.pop();
            redrawCanvas();
        };
        canvas.__saturnifyClearDrawing = () => {
            state.strokes = [];
            state.currentStroke = null;
            redrawCanvas();
        };
        canvas.__saturnifyResizeDrawing = () => resizeCanvas();

        const resizeCanvas = () => {
            const ratio = window.devicePixelRatio || 1;
            const width = Math.max(1, block.clientWidth);
            const height = Math.max(1, block.scrollHeight);
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            redrawCanvas();
        };

        canvas.__saturnifySetDrawingStrokes = (savedStrokes, savedStyle) => {
            if (savedStyle) {
                state.drawColor = savedStyle.color || state.drawColor;
                state.drawSize = Number(savedStyle.size) || state.drawSize;
                state.eraserSize = Number(savedStyle.eraserSize) || state.eraserSize;

                const sizeToggle = block.querySelector('.question-markup-option-toggle:not(.question-markup-color-toggle)');
                if (sizeToggle) sizeToggle.dataset.selectedSize = String(state.drawSize);
                block.querySelectorAll('.question-markup-size-option').forEach(option => {
                    option.classList.toggle('is-selected', Number(option.title.match(/\d+/)?.[0]) === state.drawSize);
                });

                const colorToggle = block.querySelector('.question-markup-color-toggle');
                if (colorToggle) {
                    colorToggle.style.setProperty('--ink-color', state.drawColor);
                    colorToggle.dataset.selectedColor = state.drawColor;
                }
                block.querySelectorAll('.question-markup-ink-option').forEach(option => {
                    option.classList.toggle('is-selected', option.style.backgroundColor === state.drawColor);
                });
            }
            resizeCanvas();
            const width = Math.max(1, block.clientWidth);
            const height = Math.max(1, block.scrollHeight);
            state.strokes = savedStrokes.map(stroke => {
                const isLegacyStroke = Array.isArray(stroke);
                const points = isLegacyStroke ? stroke : stroke.points;
                return {
                    mode: isLegacyStroke ? 'draw' : stroke.mode || 'draw',
                    color: isLegacyStroke ? '#d94f5c' : stroke.color || '#d94f5c',
                    width: isLegacyStroke ? 3 : Number(stroke.width) || (stroke.mode === 'erase' ? 18 : 3),
                    points: points.map(point => ({ x: point.x * width, y: point.y * height }))
                };
            });
            redrawCanvas();
        };

        const setDrawingMode = mode => {
            if (getComputedStyle(block).position === 'static') block.style.position = 'relative';
            resizeCanvas();
            const isDrawing = mode === 'draw';
            const isErasing = mode === 'erase';
            canvas.classList.toggle('is-drawing', isDrawing || isErasing);
            canvas.classList.toggle('is-erasing', isErasing);
            drawButton.classList.toggle('is-active', isDrawing);
            drawButton.textContent = isDrawing ? '✎ Đang vẽ' : '✎ Vẽ đánh dấu';
            const eraserButton = block.querySelector('.question-eraser-control');
            if (eraserButton) {
                eraserButton.classList.toggle('is-active', isErasing);
                eraserButton.textContent = isErasing ? 'Tắt tẩy' : '⌫ Tẩy';
                eraserButton.title = isErasing ? 'Tắt chế độ tẩy' : 'Bật tẩy và kéo trên nét cần xóa';
                eraserButton.setAttribute('aria-label', eraserButton.title);
            }
        };

        if (!canvas.__saturnifyDrawingReady) {
            let drawing = false;
            const getPoint = event => {
                const rect = canvas.getBoundingClientRect();
                return { x: event.clientX - rect.left, y: event.clientY - rect.top };
            };

            canvas.addEventListener('pointerdown', event => {
                if (!canvas.classList.contains('is-drawing')) return;
                drawing = true;
                canvas.setPointerCapture(event.pointerId);
                const mode = canvas.classList.contains('is-erasing') ? 'erase' : 'draw';
                state.currentStroke = {
                    mode,
                    color: state.drawColor,
                    width: mode === 'erase' ? state.eraserSize : state.drawSize,
                    points: [getPoint(event)]
                };
            });
            canvas.addEventListener('pointermove', event => {
                if (!drawing) return;
                state.currentStroke.points.push(getPoint(event));
                redrawCanvas();
            });
            ['pointerup', 'pointercancel'].forEach(type => canvas.addEventListener(type, () => {
                drawing = false;
                if (state.currentStroke?.points.length) {
                    state.strokes.push(state.currentStroke);
                    const owner = canvas.closest('.question-block, .question');
                    if (owner) owner.__saturnifyLastEdit = 'draw';
                }
                state.currentStroke = null;
                redrawCanvas();
            }));
            canvas.__saturnifyDrawingReady = true;
        }

        return { canvas, resizeCanvas, setDrawingMode, state };
    }

    function createHighlightControls(block, toolbar) {
        if (toolbar.querySelector('.quiz-highlight-toolbar')) return;

        const closeOnPointerLeave = (group, closePopover) => {
            let closeTimer;
            group.addEventListener('pointerenter', () => window.clearTimeout(closeTimer));
            group.addEventListener('pointerleave', () => {
                closeTimer = window.setTimeout(closePopover, 250);
            });
        };

        const highlightToolbar = document.createElement('span');
        highlightToolbar.className = 'quiz-highlight-toolbar';
        highlightToolbar.setAttribute('aria-label', 'Công cụ đánh dấu văn bản');

        const toggleButton = document.createElement('button');
        toggleButton.className = 'question-markup-toggle';
        toggleButton.type = 'button';
        toggleButton.textContent = '🖊️';
        toggleButton.title = 'Mở công cụ highlight và đánh dấu';
        toggleButton.setAttribute('aria-label', 'Mở công cụ highlight và đánh dấu');

        const markupMenu = document.createElement('span');
        markupMenu.className = 'question-markup-menu';
        markupMenu.hidden = true;

        toggleButton.addEventListener('click', () => {
            markupMenu.hidden = !markupMenu.hidden;
            toggleButton.setAttribute('aria-expanded', String(!markupMenu.hidden));
        });

        const colors = [
            ['#fff3a6', 'Highlight vàng'],
            ['#d9f3df', 'Highlight xanh lá'],
            ['#dbeafe', 'Highlight xanh dương'],
            ['#ffdce5', 'Highlight hồng']
        ];

        colors.forEach(([color, label]) => {
            const button = document.createElement('button');
            button.className = 'question-highlight-color';
            button.type = 'button';
            button.title = label;
            button.setAttribute('aria-label', label);
            button.style.backgroundColor = color;
            button.addEventListener('mousedown', event => event.preventDefault());
            button.addEventListener('click', () => applyTextMark(block, 'highlight', color));
            markupMenu.appendChild(button);
        });

        const underlineButton = document.createElement('button');
        underlineButton.className = 'question-underline-control question-underline-mark-control';
        underlineButton.type = 'button';
        underlineButton.textContent = 'U';
        underlineButton.title = 'Gạch chân đoạn đã chọn';
        underlineButton.setAttribute('aria-label', 'Gạch chân đoạn đã chọn');
        underlineButton.addEventListener('mousedown', event => event.preventDefault());
        underlineButton.addEventListener('click', () => applyTextMark(block, 'underline'));
        markupMenu.appendChild(underlineButton);

        const strikeButton = document.createElement('button');
        strikeButton.className = 'question-underline-control question-strike-control';
        strikeButton.type = 'button';
        strikeButton.textContent = 'S';
        strikeButton.title = 'Gạch ngang chữ đã chọn';
        strikeButton.setAttribute('aria-label', 'Gạch ngang chữ đã chọn');
        strikeButton.addEventListener('mousedown', event => event.preventDefault());
        strikeButton.addEventListener('click', () => applyTextMark(block, 'strike'));
        markupMenu.appendChild(strikeButton);

        const removeSelectedButton = document.createElement('button');
        removeSelectedButton.className = 'question-markup-clear question-remove-selected-control';
        removeSelectedButton.type = 'button';
        removeSelectedButton.textContent = '🧽 Tẩy vùng chọn';
        removeSelectedButton.title = 'Tẩy highlight chỉ ở đoạn đã chọn';
        removeSelectedButton.setAttribute('aria-label', 'Tẩy highlight chỉ ở đoạn đã chọn');
        removeSelectedButton.addEventListener('mousedown', event => event.preventDefault());
        removeSelectedButton.addEventListener('click', () => removeSelectedMarks(block));

        const eraserToolsGroup = document.createElement('span');
        eraserToolsGroup.className = 'question-markup-option-group question-eraser-tools-group';
        const eraserToolsToggle = document.createElement('button');
        eraserToolsToggle.className = 'question-markup-option-toggle';
        eraserToolsToggle.type = 'button';
        eraserToolsToggle.textContent = '🧽';
        eraserToolsToggle.title = 'Mở công cụ tẩy';
        eraserToolsToggle.setAttribute('aria-label', 'Mở công cụ tẩy');
        const eraserToolsMenu = document.createElement('span');
        eraserToolsMenu.className = 'question-markup-option-popover question-eraser-tools-menu';
        eraserToolsMenu.hidden = true;
        const positionEraserMenu = () => {
            if (eraserToolsMenu.hidden) return;
            const groupRect = eraserToolsGroup.getBoundingClientRect();
            const toggleRect = eraserToolsToggle.getBoundingClientRect();
            const menuRect = eraserToolsMenu.getBoundingClientRect();
            const margin = 8;
            const wantedLeft = toggleRect.left + toggleRect.width / 2 - menuRect.width / 2;
            const viewportLeft = Math.max(margin, Math.min(wantedLeft, window.innerWidth - menuRect.width - margin));
            eraserToolsMenu.style.left = `${viewportLeft - groupRect.left}px`;
            eraserToolsMenu.style.transform = 'none';
        };
        eraserToolsToggle.addEventListener('click', () => {
            eraserToolsMenu.hidden = !eraserToolsMenu.hidden;
            if (!eraserToolsMenu.hidden) requestAnimationFrame(positionEraserMenu);
        });
        closeOnPointerLeave(eraserToolsGroup, () => {
            eraserToolsMenu.hidden = true;
            eraserSizeOptions.hidden = true;
        });
        window.addEventListener('resize', positionEraserMenu);

        const clearButton = document.createElement('button');
        clearButton.className = 'question-markup-clear';
        clearButton.type = 'button';
        clearButton.textContent = '🧹 Xóa highlight';
        clearButton.title = 'Xóa highlight';
        clearButton.setAttribute('aria-label', 'Xóa highlight');
        clearButton.addEventListener('click', () => { pushMarkHistory(block); clearTextMarks(block); });
        eraserToolsMenu.appendChild(removeSelectedButton);
        eraserToolsMenu.appendChild(clearButton);

        const clearDrawingButton = document.createElement('button');
        clearDrawingButton.className = 'question-markup-clear';
        clearDrawingButton.type = 'button';
        clearDrawingButton.textContent = '🗑️ Xóa nét';
        clearDrawingButton.title = 'Xóa nét đánh dấu';
        clearDrawingButton.setAttribute('aria-label', 'Xóa nét đánh dấu');
        clearDrawingButton.addEventListener('click', () => {
            const canvas = block.querySelector('.question-annotation-canvas');
            canvas?.__saturnifyClearDrawing?.();
        });
        eraserToolsMenu.appendChild(clearDrawingButton);

        const undoDrawingButton = document.createElement('button');
        undoDrawingButton.className = 'question-underline-control question-annotate-undo';
        undoDrawingButton.type = 'button';
        undoDrawingButton.textContent = '↩️';
        undoDrawingButton.title = 'Hoàn tác nét vẽ cuối cùng';
        undoDrawingButton.setAttribute('aria-label', 'Hoàn tác nét vẽ cuối cùng');
        undoDrawingButton.addEventListener('click', () => {
            const canvas = block.querySelector('.question-annotation-canvas');
            if (block.__saturnifyLastEdit === 'mark' && undoTextMarks(block)) return;
            canvas?.__saturnifyUndoDrawing?.();
        });

        const clearAllButton = document.createElement('button');
        clearAllButton.className = 'question-markup-clear question-markup-clear-all';
        clearAllButton.type = 'button';
        clearAllButton.textContent = '💥 Xóa tất cả';
        clearAllButton.title = 'Xóa toàn bộ highlight và nét vẽ';
        clearAllButton.setAttribute('aria-label', 'Xóa toàn bộ highlight và nét vẽ');
        clearAllButton.addEventListener('click', () => {
            pushMarkHistory(block);
            clearTextMarks(block);
            const canvas = block.querySelector('.question-annotation-canvas');
            canvas?.__saturnifyClearDrawing?.();
        });
        eraserToolsMenu.appendChild(clearAllButton);

        const drawButton = document.createElement('button');
        drawButton.className = 'question-annotate-control';
        drawButton.type = 'button';
        drawButton.textContent = '✏️ Vẽ đánh dấu';
        drawButton.title = 'Vẽ đánh dấu lên câu hỏi';
        drawButton.setAttribute('aria-label', 'Vẽ đánh dấu lên câu hỏi');
        const annotation = setupAnnotationCanvas(block, drawButton);
        drawButton.addEventListener('click', () => {
            const nextMode = annotation.canvas.classList.contains('is-drawing') && !annotation.canvas.classList.contains('is-erasing')
                ? 'off'
                : 'draw';
            annotation.setDrawingMode(nextMode);
        });
        markupMenu.appendChild(drawButton);

        const sizeGroup = document.createElement('span');
        sizeGroup.className = 'question-markup-option-group';
        const sizeToggle = document.createElement('button');
        sizeToggle.className = 'question-markup-option-toggle';
        sizeToggle.type = 'button';
        sizeToggle.textContent = '📏';
        sizeToggle.title = 'Chọn cỡ bút và tẩy';
        sizeToggle.setAttribute('aria-label', 'Chọn cỡ bút và tẩy');
        const sizeOptions = document.createElement('span');
        sizeOptions.className = 'question-markup-option-popover';
        sizeOptions.hidden = true;
        sizeToggle.addEventListener('click', () => { sizeOptions.hidden = !sizeOptions.hidden; });
        closeOnPointerLeave(sizeGroup, () => { sizeOptions.hidden = true; });
        sizeToggle.dataset.selectedSize = String(annotation.state.drawSize);
        [[2, 'Nhỏ', '·'], [3, 'Vừa', '●'], [6, 'Lớn', '⬤']].forEach(([size, label, glyph]) => {
            const option = document.createElement('button');
            option.className = 'question-markup-size-option';
            option.type = 'button';
            option.textContent = glyph;
            option.title = `${label}: cỡ ${size}`;
            option.setAttribute('aria-label', option.title);
            option.style.fontSize = `${Math.max(10, Number(size) * 2)}px`;
            option.classList.toggle('is-selected', Number(size) === annotation.state.drawSize);
            option.addEventListener('click', () => {
                annotation.state.drawSize = Number(size);
                sizeToggle.dataset.selectedSize = String(size);
                sizeOptions.querySelectorAll('.question-markup-size-option').forEach(button => button.classList.toggle('is-selected', button === option));
                sizeOptions.hidden = true;
            });
            sizeOptions.appendChild(option);
        });
        sizeGroup.append(sizeToggle, sizeOptions);
        markupMenu.appendChild(sizeGroup);

        const colorGroup = document.createElement('span');
        colorGroup.className = 'question-markup-option-group';
        const colorToggle = document.createElement('button');
        colorToggle.className = 'question-markup-option-toggle question-markup-color-toggle';
        colorToggle.type = 'button';
        colorToggle.textContent = '🎨';
        colorToggle.title = 'Chọn màu mực';
        colorToggle.setAttribute('aria-label', 'Chọn màu mực');
        colorToggle.style.setProperty('--ink-color', annotation.state.drawColor);
        colorToggle.dataset.selectedColor = annotation.state.drawColor;
        const colorOptions = document.createElement('span');
        colorOptions.className = 'question-markup-option-popover question-markup-color-options';
        colorOptions.hidden = true;
        colorToggle.addEventListener('click', () => { colorOptions.hidden = !colorOptions.hidden; });
        closeOnPointerLeave(colorGroup, () => { colorOptions.hidden = true; });
        [['#d94f5c', 'Đỏ'], ['#356f9f', 'Xanh dương'], ['#27855b', 'Xanh lá'], ['#7758a6', 'Tím'], ['#252a34', 'Đen']].forEach(([color, label]) => {
            const option = document.createElement('button');
            option.className = 'question-markup-ink-option';
            option.type = 'button';
            option.title = label;
            option.setAttribute('aria-label', `Mực ${label}`);
            option.style.backgroundColor = color;
            option.classList.toggle('is-selected', color === annotation.state.drawColor);
            option.addEventListener('click', () => {
                annotation.state.drawColor = color;
                colorToggle.style.setProperty('--ink-color', color);
                colorToggle.dataset.selectedColor = color;
                colorOptions.querySelectorAll('.question-markup-ink-option').forEach(button => button.classList.toggle('is-selected', button === option));
                colorOptions.hidden = true;
            });
            colorOptions.appendChild(option);
        });
        colorGroup.append(colorToggle, colorOptions);
        markupMenu.appendChild(colorGroup);

        const eraserButton = document.createElement('button');
        eraserButton.className = 'question-markup-clear question-eraser-control';
        eraserButton.type = 'button';
        eraserButton.textContent = '🧼 Tẩy';
        eraserButton.title = 'Bật tẩy và kéo trên nét cần xóa';
        eraserButton.setAttribute('aria-label', 'Bật tẩy nét đánh dấu');
        eraserButton.addEventListener('click', () => {
            const nextMode = annotation.canvas.classList.contains('is-erasing') ? 'off' : 'erase';
            annotation.setDrawingMode(nextMode);
        });

        const eraserSizeGroup = document.createElement('span');
        eraserSizeGroup.className = 'question-markup-option-group';
        const eraserSizeToggle = document.createElement('button');
        eraserSizeToggle.className = 'question-markup-option-toggle';
        eraserSizeToggle.type = 'button';
        eraserSizeToggle.textContent = '📏 Cỡ tẩy';
        eraserSizeToggle.title = 'Chọn cỡ tẩy';
        eraserSizeToggle.setAttribute('aria-label', 'Chọn cỡ tẩy');
        eraserSizeToggle.dataset.selectedSize = String(annotation.state.eraserSize);
        const eraserSizeOptions = document.createElement('span');
        eraserSizeOptions.className = 'question-markup-option-popover question-markup-size-options';
        eraserSizeOptions.hidden = true;
        eraserSizeToggle.addEventListener('click', () => {
            eraserSizeOptions.hidden = !eraserSizeOptions.hidden;
            if (eraserSizeOptions.hidden) return;

            eraserSizeOptions.style.position = 'fixed';
            eraserSizeOptions.style.bottom = 'auto';
            eraserSizeOptions.style.transform = 'none';
            const toggleRect = eraserSizeToggle.getBoundingClientRect();
            const optionsRect = eraserSizeOptions.getBoundingClientRect();
            const margin = 8;
            const wantedLeft = toggleRect.left + toggleRect.width / 2 - optionsRect.width / 2;
            eraserSizeOptions.style.left = `${Math.max(margin, Math.min(wantedLeft, window.innerWidth - optionsRect.width - margin))}px`;
            eraserSizeOptions.style.top = `${Math.min(window.innerHeight - optionsRect.height - margin, toggleRect.bottom + margin)}px`;
        });
        closeOnPointerLeave(eraserSizeGroup, () => { eraserSizeOptions.hidden = true; });
        [[10, 'Nhỏ'], [20, 'Vừa'], [32, 'Lớn']].forEach(([size, label]) => {
            const option = document.createElement('button');
            option.className = 'question-markup-size-option';
            option.type = 'button';
            option.textContent = label;
            option.title = `${label}: tẩy cỡ ${size}`;
            option.setAttribute('aria-label', option.title);
            option.classList.toggle('is-selected', Number(size) === annotation.state.eraserSize);
            option.addEventListener('click', () => {
                annotation.state.eraserSize = Number(size);
                eraserSizeToggle.dataset.selectedSize = String(size);
                eraserSizeOptions.querySelectorAll('.question-markup-size-option').forEach(button => button.classList.toggle('is-selected', button === option));
                eraserSizeOptions.hidden = true;
            });
            eraserSizeOptions.appendChild(option);
        });
        eraserSizeGroup.append(eraserSizeToggle, eraserSizeOptions);
        eraserToolsMenu.append(eraserButton, eraserSizeGroup);
        eraserToolsGroup.append(eraserToolsToggle, eraserToolsMenu);
        markupMenu.appendChild(eraserToolsGroup);
        markupMenu.appendChild(undoDrawingButton);

        highlightToolbar.append(toggleButton, markupMenu);
        toolbar.appendChild(highlightToolbar);
    }

    function formatQuestionTables() {
        const formattedTables = [];
        const getLines = element => {
            const lines = [];
            let line = { nodes: [], breakAfter: false };
            const finishLine = () => {
                lines.push(line);
                line = { nodes: [], breakAfter: false };
            };

            [...element.childNodes].forEach(node => {
                if (node.nodeName === 'BR') {
                    line.breakAfter = true;
                    finishLine();
                } else if (node.nodeType === Node.TEXT_NODE && /\r?\n/.test(node.textContent)) {
                    const parts = node.textContent.split(/\r?\n/);
                    parts.forEach((part, index) => {
                        if (part) line.nodes.push(document.createTextNode(part));
                        if (index < parts.length - 1) {
                            line.breakAfter = true;
                            finishLine();
                        }
                    });
                } else {
                    line.nodes.push(node);
                }
            });
            lines.push(line);
            return lines;
        };

        const parsePipeRow = line => {
            if (!line.nodes.some(node => node.nodeType === Node.TEXT_NODE && node.textContent.includes('|'))) return null;
            const rawText = line.nodes.map(node => node.textContent).join('');
            const cells = [[]];
            line.nodes.forEach(node => {
                if (node.nodeType !== Node.TEXT_NODE) {
                    cells[cells.length - 1].push(node);
                    return;
                }
                const parts = node.textContent.split('|');
                cells[cells.length - 1].push(document.createTextNode(parts[0]));
                parts.slice(1).forEach(part => {
                    cells.push([document.createTextNode(part)]);
                });
            });
            if (rawText.trimStart().startsWith('|')) cells.shift();
            if (rawText.trimEnd().endsWith('|')) cells.pop();
            if (cells.length < 2) return null;

            const cellText = cell => cell.map(node => node.textContent).join('').trim();
            return {
                cells,
                isSeparator: cells.every(cell => /^:?-{3,}:?$/.test(cellText(cell)))
            };
        };

        const isBlankLine = line => line.nodes.every(node => !node.textContent.trim());
        const makeTable = (rows, hasHeader = true) => {
            const table = document.createElement('table');
            table.className = 'question-data-table';
            const wrapper = document.createElement('div');
            wrapper.className = 'question-data-table-scroll';
            wrapper.appendChild(table);

            const headerRow = hasHeader ? rows[0] : null;
            if (headerRow) {
                const header = table.createTHead().insertRow();
                headerRow.cells.forEach(nodes => {
                    const cell = document.createElement('th');
                    cell.scope = 'col';
                    nodes.forEach(node => cell.appendChild(node));
                    header.appendChild(cell);
                });
            }

            const body = table.createTBody();
            (hasHeader ? rows.slice(1) : rows).forEach(row => {
                const tableRow = body.insertRow();
                row.cells.forEach((nodes, index) => {
                    const isRowHeader = index === 0 && (!headerRow || !headerRow.cells[0].some(node => node.textContent.trim()));
                    const cell = document.createElement(isRowHeader ? 'th' : 'td');
                    if (isRowHeader) cell.scope = 'row';
                    nodes.forEach(node => cell.appendChild(node));
                    tableRow.appendChild(cell);
                });
            });
            formattedTables.push(wrapper);
            return wrapper;
        };

        document.querySelectorAll('.question-text').forEach(element => {
            if (!element.textContent.includes('|')) return;
            const lines = getLines(element);
            const content = document.createDocumentFragment();
            let index = 0;
            let changed = false;

            while (index < lines.length) {
                const firstRow = parsePipeRow(lines[index]);
                if (!firstRow) {
                    lines[index].nodes.forEach(node => content.appendChild(node.cloneNode(true)));
                    if (lines[index].breakAfter) content.appendChild(document.createElement('br'));
                    index++;
                    continue;
                }

                const parsedRows = [firstRow];
                let nextIndex = index + 1;
                while (nextIndex < lines.length) {
                    const nextRow = parsePipeRow(lines[nextIndex]);
                    if (nextRow) {
                        parsedRows.push(nextRow);
                        nextIndex++;
                    } else if (isBlankLine(lines[nextIndex])) {
                        nextIndex++;
                    } else {
                        break;
                    }
                }

                const dataRows = parsedRows.filter(row => !row.isSeparator);
                if (dataRows.length < 2) {
                    lines[index].nodes.forEach(node => content.appendChild(node.cloneNode(true)));
                    if (lines[index].breakAfter) content.appendChild(document.createElement('br'));
                    index++;
                    continue;
                }

                const separatorIndex = parsedRows.findIndex(row => row.isSeparator);
                const tableRows = separatorIndex === 1
                    ? parsedRows.filter((row, rowIndex) => rowIndex !== separatorIndex)
                    : dataRows;
                const isBulletTable = separatorIndex < 0 && /^\s*[-*]\s+/.test(tableRows[0]?.cells[0]?.map(node => node.textContent).join('') || '');
                if (isBulletTable) {
                    const firstCellText = tableRows[0].cells[0].find(node => node.nodeType === Node.TEXT_NODE);
                    if (firstCellText) firstCellText.textContent = firstCellText.textContent.replace(/^\s*[-*]\s+/, '');
                }
                const firstHeaderCell = tableRows[0]?.cells[0];
                const questionLabelMatch = firstHeaderCell?.map(node => node.textContent).join('').match(/^\s*(Câu\s+\d+:)\s*/i);
                const questionLabel = questionLabelMatch?.[1];
                if (questionLabel) {
                    content.appendChild(document.createTextNode(`${questionLabel} `));
                    const firstTextNode = firstHeaderCell.find(node => node.nodeType === Node.TEXT_NODE);
                    if (firstTextNode) firstTextNode.textContent = firstTextNode.textContent.replace(/^\s*Câu\s+\d+:\s*/i, '');
                    if (firstHeaderCell.every(node => !node.textContent.trim())) tableRows[0].cells.shift();
                }
                content.appendChild(makeTable(tableRows, !isBulletTable));
                changed = true;
                index = nextIndex;
            }

            if (changed) element.replaceChildren(content);
        });

        if (formattedTables.length && window.MathJax?.typesetPromise) {
            window.MathJax.typesetPromise(formattedTables).catch(() => {});
        }
    }

    function emphasizeQuotedVocabularyQuestions() {
        const questionPattern = /(?:as used in (?:the )?(?:text|passage),?\s*(?:what does (?:the )?(?:word|phrase)\s+)?|in (?:the )?(?:text|passage),?\s*)(["“])\s*([^"”]+?)\s*["”]\s*(?:most nearly means?|means?)\b/i;
        document.querySelectorAll('.question-block, .question').forEach(block => {
            const question = block.querySelector('.question-text');
            if (!question || block.querySelector('.question-vocab-target')) return;
            const match = question.textContent.match(questionPattern);
            if (!match) return;

            const target = match[2].trim();
            if (!target) return;
            const passageText = question.textContent.slice(0, match.index);
            let targetHost = question;
            let targetStart = passageText.toLowerCase().lastIndexOf(target.toLowerCase());
            if (targetStart < 0) {
                targetHost = block.querySelector('.question-passage');
                if (!targetHost) return;
                targetStart = targetHost.textContent.toLowerCase().lastIndexOf(target.toLowerCase());
            }
            if (targetStart < 0) return;

            const textPointAt = targetOffset => {
                const walker = document.createTreeWalker(targetHost, NodeFilter.SHOW_TEXT);
                let consumed = 0;
                let node;
                while ((node = walker.nextNode())) {
                    const nodeEnd = consumed + node.textContent.length;
                    if (targetOffset <= nodeEnd) return { node, offset: targetOffset - consumed };
                    consumed = nodeEnd;
                }
                return null;
            };
            const start = textPointAt(targetStart);
            const end = textPointAt(targetStart + target.length);
            if (!start || !end) return;

            const range = document.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(end.node, end.offset);
            const emphasis = document.createElement('strong');
            emphasis.className = 'question-vocab-target';
            try {
                range.surroundContents(emphasis);
            } catch (error) {
                emphasis.appendChild(range.extractContents());
                range.insertNode(emphasis);
            }
        });
    }

    function getNoteKey(index) {
        return `${notePrefix}_${index + 1}`;
    }

    function createNoteControl(block, index) {
        if (block.querySelector('.question-note-control')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'quiz-note-toolbar';

        const noteButton = document.createElement('button');
        noteButton.className = 'question-note-control';
        noteButton.type = 'button';
        noteButton.textContent = '📝 Note';
        noteButton.setAttribute('aria-expanded', 'false');

        const panel = document.createElement('div');
        panel.className = 'question-note-panel';
        panel.hidden = true;

        const textarea = document.createElement('textarea');
        textarea.className = 'question-note-textarea';
        textarea.rows = 3;
        textarea.placeholder = 'Ghi chú cho câu này...';
        textarea.value = localStorage.getItem(getNoteKey(index)) || '';

        const hideButton = document.createElement('button');
        hideButton.className = 'question-note-hide';
        hideButton.type = 'button';
        hideButton.textContent = 'Ẩn note';

        noteButton.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
            noteButton.setAttribute('aria-expanded', String(!panel.hidden));
            if (!panel.hidden) textarea.focus();
        });

        hideButton.addEventListener('click', () => {
            panel.hidden = true;
            noteButton.setAttribute('aria-expanded', 'false');
        });

        textarea.addEventListener('input', () => {
            localStorage.setItem(getNoteKey(index), textarea.value);
        });

        panel.append(textarea, hideButton);
        toolbar.append(noteButton);
        createHighlightControls(block, toolbar);
        toolbar.append(panel);
        block.insertBefore(toolbar, block.firstChild);
    }

    function enhanceQuestionBlocks() {
        getQuestionBlocks().forEach((block, index) => {
            block.dataset.quizTitle = document.title || 'SATurnify';
            createNoteControl(block, index);
        });
    }

    function commitQuestionTime() {
        if (activeQuestionIndex < 0 || !activeQuestionStartedAt) return;
        const elapsedSeconds = Math.max(0, (Date.now() - activeQuestionStartedAt) / 1000);
        questionTimes[activeQuestionIndex + 1] = Number(((questionTimes[activeQuestionIndex + 1] || 0) + elapsedSeconds).toFixed(1));
        activeQuestionStartedAt = Date.now();
    }

    function initializeQuestionTiming() {
        const blocks = getQuestionBlocks();
        if (!blocks.length || window.__saturnifyQuestionTimingReady) return;

        window.__saturnifyQuestionTimingReady = true;
        window.__saturnifyQuestionTimes = questionTimes;
        window.__commitSaturnifyQuestionTime = commitQuestionTime;

        const setCurrentNavigatorQuestion = index => {
            const buttons = getNavigatorButtons();
            const currentButton = getNavigatorButtonForBlock(blocks[index], index, buttons);
            buttons.forEach(button => {
                const isCurrent = button === currentButton;
                button.classList.toggle('nav-current', isCurrent);
                if (isCurrent) button.setAttribute('aria-current', 'step');
                else button.removeAttribute('aria-current');
            });
        };

        const activateQuestion = nextIndex => {
            if (nextIndex < 0 || nextIndex === activeQuestionIndex) return;
            commitQuestionTime();
            activeQuestionIndex = nextIndex;
            activeQuestionStartedAt = Date.now();
            window.__saturnifyHideSelectionToolbar?.();
            setCurrentNavigatorQuestion(nextIndex);
        };
        window.__saturnifyActivateQuestion = activateQuestion;

        const observer = new IntersectionObserver(entries => {
            if (document.body.classList.contains('quiz-paged')) return;
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
            if (!visible) return;

            activateQuestion(blocks.indexOf(visible.target));
        }, { threshold: [0.5, 0.75] });

        blocks.forEach(block => observer.observe(block));
        activeQuestionIndex = 0;
        activeQuestionStartedAt = Date.now();
        setCurrentNavigatorQuestion(activeQuestionIndex);
        window.addEventListener('beforeunload', commitQuestionTime, { once: true });
    }

    function initialize() {
        unwrapQuestionLayoutWrappers();
        formatQuestionTables();
        emphasizeQuotedVocabularyQuestions();
        enhanceQuestionBlocks();
        createSelectionToolbar();
        createPdfExportControl();
        initializeQuestionTiming();
        syncNavigator();

        document.addEventListener('change', syncNavigator, true);
        document.addEventListener('input', syncNavigator, true);
        document.addEventListener('click', event => {
            if (!event.target.closest('#resetBtn, .reset-btn')) return;
            setTimeout(clearQuizVisualState, 0);
        }, true);

        const observer = new MutationObserver(() => {
            unwrapQuestionLayoutWrappers();
            formatQuestionTables();
            emphasizeQuotedVocabularyQuestions();
            enhanceQuestionBlocks();
            createPdfExportControl();
            updatePdfExportControl();
            initializeQuestionTiming();
            syncNavigator();
        });
        observer.observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
