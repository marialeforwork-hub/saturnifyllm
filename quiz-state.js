(function () {
    const notePrefix = `saturnify_note_${document.title || 'quiz'}`;
    const questionTimes = {};
    let activeQuestionIndex = -1;
    let activeQuestionStartedAt = 0;
    let printScrollY = null;

    function getQuestionBlocks() {
        return [...document.querySelectorAll('.question-block, .question')];
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
                drawButton.textContent = '✎ Vẽ';
            }
            const eraserButton = block.querySelector('.question-eraser-control');
            if (eraserButton) {
                eraserButton.classList.remove('is-active');
                eraserButton.textContent = '⌫ Tẩy';
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
        document.body.classList.remove('quiz-print-mode');
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
        button.title = 'Trong hộp thoại in, chọn Save as PDF để lưu bài';
        button.hidden = !hasCheckedAnswers();
        button.addEventListener('click', () => {
            if (!hasCheckedAnswers()) return;
            preparePrintView();
            window.print();
            window.setTimeout(cleanupPrintView, 1000);
        });
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

    function applyTextMark(block, markType, color) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        if (!block.contains(range.commonAncestorContainer)) return;

        const mark = document.createElement('span');
        mark.className = `saturnify-text-mark ${markType === 'underline' ? 'saturnify-underline' : ''}`;
        if (color) mark.style.backgroundColor = color;

        try {
            range.surroundContents(mark);
        } catch (error) {
            const fragment = range.extractContents();
            mark.appendChild(fragment);
            range.insertNode(mark);
        }

        selection.removeAllRanges();
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
        const mark = document.createElement('span');
        mark.className = `saturnify-text-mark ${savedMark.underline ? 'saturnify-underline' : ''}`;
        if (savedMark.color) mark.style.backgroundColor = savedMark.color;
        try {
            range.surroundContents(mark);
        } catch (error) {
            const fragment = range.extractContents();
            mark.appendChild(fragment);
            range.insertNode(mark);
        }
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
                    underline: mark.classList.contains('saturnify-underline')
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
            drawButton.textContent = isDrawing ? '✎ Đang vẽ' : '✎ Vẽ';
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
                if (state.currentStroke?.points.length) state.strokes.push(state.currentStroke);
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
        toggleButton.title = 'Mở công cụ highlight và annotate';
        toggleButton.setAttribute('aria-label', 'Mở công cụ highlight và annotate');

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
        underlineButton.className = 'question-underline-control';
        underlineButton.type = 'button';
        underlineButton.textContent = 'U';
        underlineButton.title = 'Gạch chân đoạn đã chọn';
        underlineButton.setAttribute('aria-label', 'Gạch chân đoạn đã chọn');
        underlineButton.addEventListener('mousedown', event => event.preventDefault());
        underlineButton.addEventListener('click', () => applyTextMark(block, 'underline'));
        markupMenu.appendChild(underlineButton);

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
        clearButton.textContent = '▧ Xóa highlight';
        clearButton.title = 'Xóa highlight';
        clearButton.setAttribute('aria-label', 'Xóa highlight');
        clearButton.addEventListener('click', () => clearTextMarks(block));
        eraserToolsMenu.appendChild(clearButton);

        const clearDrawingButton = document.createElement('button');
        clearDrawingButton.className = 'question-markup-clear';
        clearDrawingButton.type = 'button';
        clearDrawingButton.textContent = '🗑 Xóa nét';
        clearDrawingButton.title = 'Xóa nét vẽ annotate';
        clearDrawingButton.setAttribute('aria-label', 'Xóa nét vẽ annotate');
        clearDrawingButton.addEventListener('click', () => {
            const canvas = block.querySelector('.question-annotation-canvas');
            canvas?.__saturnifyClearDrawing?.();
        });
        eraserToolsMenu.appendChild(clearDrawingButton);

        const undoDrawingButton = document.createElement('button');
        undoDrawingButton.className = 'question-markup-clear question-annotate-undo';
        undoDrawingButton.type = 'button';
        undoDrawingButton.textContent = '↶ Undo';
        undoDrawingButton.title = 'Hoàn tác nét vẽ cuối cùng';
        undoDrawingButton.setAttribute('aria-label', 'Hoàn tác nét vẽ cuối cùng');
        undoDrawingButton.addEventListener('click', () => {
            const canvas = block.querySelector('.question-annotation-canvas');
            canvas?.__saturnifyUndoDrawing?.();
        });
        eraserToolsMenu.appendChild(undoDrawingButton);

        const clearAllButton = document.createElement('button');
        clearAllButton.className = 'question-markup-clear question-markup-clear-all';
        clearAllButton.type = 'button';
        clearAllButton.textContent = '⊗ Xóa tất cả';
        clearAllButton.title = 'Xóa toàn bộ highlight và nét vẽ';
        clearAllButton.setAttribute('aria-label', 'Xóa toàn bộ highlight và nét vẽ');
        clearAllButton.addEventListener('click', () => {
            clearTextMarks(block);
            const canvas = block.querySelector('.question-annotation-canvas');
            canvas?.__saturnifyClearDrawing?.();
        });
        eraserToolsMenu.appendChild(clearAllButton);

        const drawButton = document.createElement('button');
        drawButton.className = 'question-annotate-control';
        drawButton.type = 'button';
        drawButton.textContent = '✎ Vẽ';
        drawButton.title = 'Vẽ annotate lên câu hỏi';
        drawButton.setAttribute('aria-label', 'Vẽ annotate lên câu hỏi');
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
        sizeToggle.textContent = '◉';
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
        eraserButton.textContent = '⌫ Tẩy';
        eraserButton.title = 'Bật tẩy và kéo trên nét cần xóa';
        eraserButton.setAttribute('aria-label', 'Bật tẩy annotate');
        eraserButton.addEventListener('click', () => {
            const nextMode = annotation.canvas.classList.contains('is-erasing') ? 'off' : 'erase';
            annotation.setDrawingMode(nextMode);
        });

        const eraserSizeGroup = document.createElement('span');
        eraserSizeGroup.className = 'question-markup-option-group';
        const eraserSizeToggle = document.createElement('button');
        eraserSizeToggle.className = 'question-markup-option-toggle';
        eraserSizeToggle.type = 'button';
        eraserSizeToggle.textContent = '◉ Cỡ tẩy';
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
            eraserSizeOptions.style.top = `${Math.max(margin, toggleRect.top - optionsRect.height - margin)}px`;
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

        highlightToolbar.append(toggleButton, markupMenu);
        toolbar.appendChild(highlightToolbar);
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
        getQuestionBlocks().forEach((block, index) => createNoteControl(block, index));
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

        const observer = new IntersectionObserver(entries => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
            if (!visible) return;

            const nextIndex = blocks.indexOf(visible.target);
            if (nextIndex === activeQuestionIndex) return;
            commitQuestionTime();
            activeQuestionIndex = nextIndex;
            activeQuestionStartedAt = Date.now();
        }, { threshold: [0.5, 0.75] });

        blocks.forEach(block => observer.observe(block));
        activeQuestionIndex = 0;
        activeQuestionStartedAt = Date.now();
        window.addEventListener('beforeunload', commitQuestionTime, { once: true });
    }

    function initialize() {
        enhanceQuestionBlocks();
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
