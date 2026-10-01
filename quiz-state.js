(function () {
    const notePrefix = `saturnify_note_${document.title || 'quiz'}`;
    const questionTimes = {};
    let activeQuestionIndex = -1;
    let activeQuestionStartedAt = 0;

    function getQuestionBlocks() {
        return [...document.querySelectorAll('.question-block, .question')];
    }

    function getNavigatorButtons() {
        return [...document.querySelectorAll('[id^="nav_btn_"]')];
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
            const button = buttons[index];
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
        toolbar.append(noteButton, panel);
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
        initializeQuestionTiming();
        syncNavigator();

        document.addEventListener('change', syncNavigator, true);
        document.addEventListener('input', syncNavigator, true);

        const observer = new MutationObserver(() => {
            enhanceQuestionBlocks();
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
