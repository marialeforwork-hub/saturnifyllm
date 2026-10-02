// quiz-pager.js — opt-in Bluebook-style layer: question | answer split view,
// one question per page, bottom-center popup navigator, top-right Reset/Check.
// Include AFTER the script that builds the .question-block elements.
(function () {
    const getBlocks = () => [...document.querySelectorAll('.question-block')];

    function hasAnswer(block) {
        return Boolean(
            block.querySelector('input[type="radio"]:checked') ||
            [...block.querySelectorAll('input[type="text"], input[type="number"]')]
                .some(input => input.value.trim() !== '')
        );
    }

    function getResult(block) {
        if (block.querySelector('.correct-answer-label:has(input:checked), .correct-input')) return 'correct';
        if (block.querySelector('.wrong-answer-label, .wrong-input')) return 'wrong';
        return '';
    }

    function stripQuestionPrefix(textEl) {
        const walker = document.createTreeWalker(textEl, NodeFilter.SHOW_TEXT);
        const first = walker.nextNode();
        if (first) first.textContent = first.textContent.replace(/^\s*Câu\s*\d+\s*:\s*/i, '');
    }

    function restructureBlock(block, index) {
        if (block.querySelector(':scope > .qp-pane-question')) return;

        const toolbar = block.querySelector(':scope > .quiz-note-toolbar');
        const questionText = block.querySelector(':scope > .question-text');
        const passage = block.querySelector(':scope > .question-passage');
        const canvas = block.querySelector(':scope > .question-annotation-canvas');
        const skip = new Set([toolbar, questionText, passage, canvas].filter(Boolean));
        const rest = [...block.children].filter(child => !skip.has(child));

        if (questionText) stripQuestionPrefix(questionText);

        const bar = document.createElement('div');
        bar.className = 'qp-qbar';
        bar.innerHTML = `<span class="qp-qnum">${index + 1}</span>` +
            '<button type="button" class="qp-mark"><svg viewBox="0 0 12 16" aria-hidden="true"><path d="M1 1h10v14l-5-3.5L1 15z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>Đánh dấu xem lại</button>';

        // With a separate passage: passage left, stem + options right. Otherwise text left, options right.
        const questionPane = document.createElement('div');
        questionPane.className = 'qp-pane-question';
        const answerPane = document.createElement('div');
        answerPane.className = 'qp-pane-answer';
        answerPane.appendChild(bar);

        if (passage) {
            questionPane.appendChild(passage);
            if (questionText) answerPane.appendChild(questionText);
        } else if (questionText) {
            questionPane.appendChild(questionText);
        }
        rest.forEach(child => answerPane.appendChild(child));

        const divider = document.createElement('div');
        divider.className = 'qp-divider';

        if (toolbar) block.appendChild(toolbar);
        block.append(questionPane, divider, answerPane);
        if (canvas) block.appendChild(canvas);
    }

    function init() {
        const blocks = getBlocks();
        if (!blocks.length || document.body.classList.contains('quiz-paged')) return;

        blocks.forEach(restructureBlock);
        document.body.classList.add('quiz-paged');

        const studentId = sessionStorage.getItem('studentId') || sessionStorage.getItem('studentName') || 'guest';
        const stateKey = `quiz_pager_${studentId}_${document.title}`;
        let current = 0;
        const isFlagged = index => blocks[index].classList.contains('flagged-for-review');
        try {
            const saved = JSON.parse(localStorage.getItem(stateKey) || 'null');
            if (saved) {
                current = Math.max(0, Math.min(blocks.length - 1, Number(saved.current) || 0));
                (saved.flagged || []).forEach(i => blocks[i]?.classList.add('flagged-for-review'));
            }
        } catch (e) {}

        const persistState = () => {
            const flaggedIndexes = blocks.map((_, i) => i).filter(isFlagged);
            try { localStorage.setItem(stateKey, JSON.stringify({ current, flagged: flaggedIndexes })); } catch (e) {}
        };

        const showToast = message => {
            document.querySelector('.qp-toast')?.remove();
            const toast = document.createElement('div');
            toast.className = 'qp-toast';
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 1800);
        };

        // Header
        const header = document.createElement('div');
        header.className = 'qp-header';
        const title = document.createElement('div');
        title.className = 'qp-title';
        title.textContent = document.title;
        const topbar = document.createElement('div');
        topbar.className = 'qp-topbar';
        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'qp-reset-btn';
        resetBtn.innerHTML = '🔄 <span class="qp-label">Làm lại</span>';
        const checkBtn = document.createElement('button');
        checkBtn.type = 'button';
        checkBtn.className = 'qp-check-btn';
        checkBtn.innerHTML = '✅ <span class="qp-label">Kiểm tra</span>';
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'qp-save-btn';
        saveBtn.innerHTML = '💾 <span class="qp-label">Lưu tiến độ</span>';
        const exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.className = 'qp-exit-btn';
        exitBtn.innerHTML = '✕ <span class="qp-label">Thoát</span>';
        topbar.append(saveBtn, resetBtn, checkBtn, exitBtn);

        const sizeKey = 'quiz_pager_font_size';
        const sizeWrap = document.createElement('label');
        sizeWrap.className = 'qp-size';
        sizeWrap.title = 'Cỡ chữ đề bài và đáp án';
        sizeWrap.innerHTML = '<small>A</small><input type="range" min="0.85" max="1.9" step="0.05" aria-label="Cỡ chữ đề bài và đáp án"><span style="font-size:1.15rem">A</span>';
        const sizeInput = sizeWrap.querySelector('input');
        const applySize = value => document.body.style.setProperty('--qp-fs', `${value}rem`);
        let savedSize = 1.05;
        try { savedSize = Number(localStorage.getItem(sizeKey)) || 1.05; } catch (e) {}
        sizeInput.value = String(savedSize);
        applySize(savedSize);
        sizeInput.addEventListener('input', () => {
            applySize(sizeInput.value);
            try { localStorage.setItem(sizeKey, sizeInput.value); } catch (e) {}
        });
        header.append(title, sizeWrap, topbar);

        // Footer
        const footer = document.createElement('div');
        footer.className = 'qp-footer';
        const brand = document.createElement('div');
        brand.className = 'qp-brand';
        brand.innerHTML = '<img src="logo.png" alt="" onerror="this.remove()"><span>SATurnify</span>';
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'qp-nav-pill';
        const footerNav = document.createElement('div');
        footerNav.className = 'qp-footer-nav';
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'qp-back-btn';
        backBtn.textContent = 'Back';
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'qp-next-btn';
        nextBtn.textContent = 'Next';
        footerNav.append(backBtn, nextBtn);
        footer.append(brand, pill, footerNav);

        // Navigator modal
        const modal = document.createElement('div');
        modal.className = 'qp-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="qp-modal-card" role="dialog" aria-modal="true" aria-label="Danh sách câu hỏi">
                <button type="button" class="qp-modal-close" aria-label="Đóng">×</button>
                <h2 class="qp-modal-title"></h2>
                <div class="qp-legend">
                    <span>📍 Hiện tại</span>
                    <span><i class="qp-lg-box"></i> Chưa làm</span>
                    <span><i class="qp-lg-box is-done"></i> Đã làm</span>
                    <span><i class="qp-lg-flag"></i> Đánh dấu</span>
                </div>
                <div class="qp-grid"></div>
            </div>`;
        modal.querySelector('.qp-modal-title').textContent = document.title;
        const grid = modal.querySelector('.qp-grid');
        const navButtons = blocks.map((_, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = String(index + 1);
            btn.addEventListener('click', () => { goTo(index); closeModal(); });
            grid.appendChild(btn);
            return btn;
        });

        document.body.append(header, footer, modal);

        function openModal() { refreshStates(); modal.hidden = false; }
        function closeModal() { modal.hidden = true; }
        pill.addEventListener('click', openModal);
        modal.querySelector('.qp-modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeModal();
        });

        blocks.forEach((block, index) => {
            const markBtn = block.querySelector('.qp-mark');
            markBtn.addEventListener('click', () => {
                block.classList.toggle('flagged-for-review');
                refreshStates();
            });
        });

        function refreshStates() {
            persistState();
            navButtons.forEach((btn, index) => {
                const block = blocks[index];
                const result = getResult(block);
                btn.classList.toggle('qp-current', index === current);
                btn.classList.toggle('qp-flagged', isFlagged(index));
                btn.classList.toggle('qp-correct', result === 'correct');
                btn.classList.toggle('qp-wrong', result === 'wrong');
                btn.classList.toggle('qp-answered', !result && hasAnswer(block));
                block.querySelector('.qp-mark')?.classList.toggle('is-flagged', isFlagged(index));
            });
        }

        function updateUI() {
            blocks.forEach((block, index) => block.classList.toggle('qp-active', index === current));
            pill.textContent = `Câu ${current + 1} / ${blocks.length} ⌃`;
            backBtn.disabled = current === 0;
            nextBtn.disabled = current === blocks.length - 1;
            window.__saturnifyActivateQuestion?.(current);
            refreshStates();
        }

        function goTo(index) {
            current = Math.max(0, Math.min(blocks.length - 1, index));
            updateUI();
            window.__saturnifyCloseFloatingHighlightTools?.();
            blocks[current].querySelectorAll('.question-annotation-canvas').forEach(c => c.__saturnifyResizeDrawing?.());
        }

        backBtn.addEventListener('click', () => goTo(current - 1));
        nextBtn.addEventListener('click', () => goTo(current + 1));

        saveBtn.addEventListener('click', () => {
            persistState();
            document.getElementById('quiz')?.dispatchEvent(new Event('change', { bubbles: true }));
            const embedded = window.parent && window.parent !== window;
            if (embedded) {
                try { window.parent.manualSaveDraft(); } catch (e) { window.parent.postMessage({ type: 'SAT_SAVE_DRAFT' }, '*'); }
            }
            showToast('💾 Đã lưu tiến độ làm bài!');
        });

        const annotationKey = `quiz_annotations_${studentId}_${document.title}`;
        const isEmbedded = () => window.parent && window.parent !== window;

        const exitModal = document.createElement('div');
        exitModal.className = 'qp-modal';
        exitModal.hidden = true;
        exitModal.innerHTML = `
            <div class="qp-modal-card qp-exit-card" role="dialog" aria-modal="true">
                <h2 class="qp-modal-title">Thoát bài làm?</h2>
                <p>Tiến độ đáp án đã được lưu. Em có muốn lưu cả highlight/annotate không?</p>
                <div class="qp-exit-actions">
                    <button type="button" class="qp-stay">Ở lại làm bài</button>
                    <button type="button" class="qp-leave">Thoát không lưu</button>
                    <button type="button" class="qp-leave-save">Lưu annotate & thoát</button>
                </div>
            </div>`;
        document.body.appendChild(exitModal);

        const leave = saveAnnotations => {
            persistState();
            if (isEmbedded()) {
                try { window.parent.finishExitQuiz(saveAnnotations); return; } catch (e) { /* fall through */ }
            }
            if (saveAnnotations) {
                try { localStorage.setItem(annotationKey, JSON.stringify(window.__saturnifySerializeAnnotations?.() || {})); } catch (e) {}
            }
            window.location.href = 'index.html';
        };

        exitBtn.addEventListener('click', () => { exitModal.hidden = false; });
        exitModal.querySelector('.qp-stay').addEventListener('click', () => { exitModal.hidden = true; });
        exitModal.querySelector('.qp-leave').addEventListener('click', () => leave(false));
        exitModal.querySelector('.qp-leave-save').addEventListener('click', () => leave(true));
        exitModal.addEventListener('click', event => { if (event.target === exitModal) exitModal.hidden = true; });
        document.addEventListener('keydown', event => { if (event.key === 'Escape') exitModal.hidden = true; });

        if (!isEmbedded()) {
            setTimeout(() => {
                try {
                    const savedAnnotations = JSON.parse(localStorage.getItem(annotationKey) || 'null');
                    if (savedAnnotations) window.__saturnifyRestoreAnnotations?.(savedAnnotations);
                } catch (e) {}
            }, 300);
        }

        checkBtn.addEventListener('click', () => {
            document.getElementById('checkBtn')?.click();
            setTimeout(refreshStates, 0);
        });
        resetBtn.addEventListener('click', () => {
            document.getElementById('resetBtn')?.click();
            setTimeout(() => {
                if (!blocks.some(hasAnswer)) { blocks.forEach(b => b.classList.remove('flagged-for-review')); goTo(0); }
                refreshStates();
            }, 0);
        });

        document.addEventListener('change', refreshStates);
        document.addEventListener('input', refreshStates);

        updateUI();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
