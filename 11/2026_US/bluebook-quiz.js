(function () {
    'use strict';

    const quiz = window.BLUEBOOK_QUIZ;
    const root = document.getElementById('bluebookQuiz');
    if (!quiz || !root) {
        throw new Error('Không tải được dữ liệu bài tập Bluebook.');
    }

    const chartQuestionIds = {
        '11/2026_US/ORG_1': new Set([8, 39, 41, 42, 43, 65, 66, 67, 88, 90, 91, 95, 98, 104, 105, 110, 113, 116, 119, 132, 135, 142]),
        '11/2026_US/ORG_2': new Set([11, 14, 37, 40, 63, 89, 93, 104, 105, 115, 116, 121, 129, 142])
    };
    const answerChartQuestionIds = {
        '11/2026_US/ORG_1': new Set([87]),
        '11/2026_US/ORG_2': new Set([87, 128])
    };
    const WORD_CHOICE_GAP_PROMPT = 'Which choice completes the text with the most logical and precise word or phrase?';
    const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
    const MATH_OPERATORS = new Set(['=', '<', '>', '≤', '≥', '+', '-', '−', '×', '÷']);
    const MATH_FUNCTION_PATTERN = /^(?:sin|cos|tan|log|ln)/;
    const NON_VARIABLE_CAPITALS = new Set(['NOT', 'II', 'III', 'IV', 'US']);
    const TERM_START_PATTERN = /[A-Za-z0-9π√(]/;
    const displaySectionTitles = getDisplaySectionTitles();
    const totalQuestions = quiz.sections.reduce((total, section) => total + section.questions.length, 0);
    const studentId = sessionStorage.getItem('studentId') || 'GUEST';
    const storageKey = `quiz_draft_${studentId}_${quiz.title}`;
    const eliminationStorageKey = `${storageKey}_eliminated`;
    const flagStorageKey = `${storageKey}_flagged`;
    const setup = document.getElementById('quizSetup');
    const sectionPicker = document.getElementById('sectionPicker');
    const runner = document.getElementById('quizRunner');
    const completion = document.getElementById('quizCompletion');
    const modeButtons = document.getElementById('modeButtons');
    const sectionButtons = document.getElementById('sectionButtons');
    const questionBank = document.getElementById('questionBank');
    const questionFontSize = document.getElementById('questionFontSize');
    const questionCounter = document.getElementById('questionCounter');
    const sectionTitle = document.getElementById('sectionTitle');
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');
    const notice = document.getElementById('notice');
    const previousButton = document.getElementById('previousButton');
    const nextButton = document.getElementById('nextButton');
    const checkButton = document.getElementById('checkButton');
    const continueButton = document.getElementById('continueButton');
    const resultTitle = document.getElementById('resultTitle');
    const resultScore = document.getElementById('resultScore');
    const resultActions = document.getElementById('resultActions');

    let activeSectionIndex = 0;
    let activeQuestionIndex = 0;
    let mode = 'full';
    let sectionChecked = false;
    let continueAction = 'next';
    let startedAt = new Date();
    let resultsSent = false;
    let eliminatedOptions = loadEliminatedOptions();
    let flaggedQuestionIds = loadFlaggedQuestions();
    const questionElements = new Map();
    const questionMetadata = new Map();
    const navigatorToggle = document.createElement('button');
    navigatorToggle.className = 'qp-nav-pill';
    navigatorToggle.type = 'button';
    navigatorToggle.textContent = 'Câu 1 / 1 ⌃';
    navigatorToggle.setAttribute('aria-expanded', 'false');
    const questionNavigator = document.createElement('nav');
    questionNavigator.className = 'qp-grid question-navigator';
    questionNavigator.setAttribute('aria-label', 'Điều hướng câu hỏi');
    const navigatorModal = document.createElement('div');
    navigatorModal.className = 'qp-modal';
    navigatorModal.hidden = true;
    const navigatorCard = document.createElement('div');
    navigatorCard.className = 'qp-modal-card';
    navigatorCard.setAttribute('role', 'dialog');
    navigatorCard.setAttribute('aria-modal', 'true');
    navigatorCard.setAttribute('aria-labelledby', 'bluebookNavigatorTitle');
    const navigatorModalTitle = document.createElement('h2');
    navigatorModalTitle.className = 'qp-modal-title';
    navigatorModalTitle.id = 'bluebookNavigatorTitle';
    const navigatorCloseButton = document.createElement('button');
    navigatorCloseButton.className = 'qp-modal-close';
    navigatorCloseButton.type = 'button';
    navigatorCloseButton.textContent = '×';
    navigatorCloseButton.setAttribute('aria-label', 'Đóng navigator');
    const navigatorLegend = document.createElement('div');
    navigatorLegend.className = 'qp-legend';
    navigatorLegend.innerHTML = '<span><i class="qp-lg-box is-done"></i> Đã trả lời</span><span><i class="qp-lg-box"></i> Chưa trả lời</span><span><i class="qp-lg-flag"></i> Đánh dấu xem lại</span>';
    navigatorCard.append(navigatorCloseButton, navigatorModalTitle, navigatorLegend, questionNavigator);
    navigatorModal.appendChild(navigatorCard);

    const legacyHeader = document.createElement('header');
    legacyHeader.className = 'qp-header';
    legacyHeader.hidden = true;
    const legacyTitle = document.createElement('div');
    legacyTitle.className = 'qp-title';
    legacyTitle.textContent = quiz.title;
    const legacyTopbar = document.createElement('div');
    legacyTopbar.className = 'qp-topbar';
    const saveHeaderButton = createHeaderButton('qp-save-btn', '💾', 'Lưu', 'Lưu tiến độ');
    const resetHeaderButton = createHeaderButton('qp-reset-btn', '🔄', 'Làm lại', 'Làm lại bài');
    const checkHeaderButton = createHeaderButton('qp-check-btn', '✓', 'Kiểm tra', 'Kiểm tra phần');
    const exitHeaderButton = createHeaderButton('qp-exit-btn', '✕', 'Thoát', 'Thoát bài làm');
    legacyTopbar.append(saveHeaderButton, resetHeaderButton, checkHeaderButton, exitHeaderButton);
    legacyHeader.append(legacyTitle, legacyTopbar);

    const legacyFooter = document.createElement('footer');
    legacyFooter.className = 'qp-footer';
    legacyFooter.hidden = true;
    const legacyBrand = document.createElement('div');
    legacyBrand.className = 'qp-brand';
    const logo = document.createElement('img');
    logo.src = '../../logo.png';
    logo.alt = '';
    logo.addEventListener('error', () => logo.remove(), { once: true });
    const brandText = document.createElement('span');
    brandText.textContent = 'SATurnify';
    legacyBrand.append(logo, brandText);
    const footerNavigation = document.createElement('div');
    footerNavigation.className = 'qp-footer-nav';
    previousButton.className = 'qp-back-btn';
    previousButton.textContent = 'Back';
    nextButton.className = 'qp-next-btn';
    nextButton.textContent = 'Next';
    continueButton.className = 'qp-next-btn';
    footerNavigation.append(previousButton, nextButton, continueButton);
    legacyFooter.append(legacyBrand, navigatorToggle, footerNavigation);

    const fontSizeControl = questionFontSize.closest('.quiz-font-size');
    const fontSizeControlHome = fontSizeControl.parentElement;
    document.body.append(legacyHeader, legacyFooter, navigatorModal);

    navigatorToggle.addEventListener('click', () => {
        navigatorModal.hidden = !navigatorModal.hidden;
        navigatorToggle.setAttribute('aria-expanded', String(!navigatorModal.hidden));
        if (!navigatorModal.hidden) navigatorCloseButton.focus();
    });
    navigatorCloseButton.addEventListener('click', closeNavigator);
    navigatorModal.addEventListener('click', event => {
        if (event.target === navigatorModal) closeNavigator();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !navigatorModal.hidden) closeNavigator();
    });
    saveHeaderButton.addEventListener('click', () => {
        saveProgress();
        showLegacyToast('Đã lưu tiến độ làm bài.');
    });
    checkHeaderButton.addEventListener('click', checkSection);
    exitHeaderButton.addEventListener('click', exitToSetup);

    document.title = quiz.title;
    document.getElementById('quizTitle').textContent = quiz.title;
    document.getElementById('questionTotal').textContent = `${totalQuestions} câu hỏi`;
    root.classList.add('is-ready');

    quiz.sections.forEach((section, sectionIndex) => {
        const sectionElement = document.createElement('section');
        sectionElement.className = 'quiz-section';
        const isMathSection = /math/i.test(section.title);
        if (isMathSection) sectionElement.classList.add('math-section');
        sectionElement.dataset.sectionIndex = String(sectionIndex);

        section.questions.forEach(question => {
            const article = document.createElement('article');
            article.className = 'question question-block';
            article.id = `question-${question.id}`;
            article.dataset.sectionIndex = String(sectionIndex);
            article.style.counterReset = `quiz-question ${question.number - 1}`;
            article.hidden = true;

            const questionBar = createQuestionBar(question);
            const parts = splitQuestionText(question.text);
            const questionPane = document.createElement('div');
            questionPane.className = 'qp-pane-question';
            const questionText = document.createElement('div');
            questionText.className = 'question-text';
            if (parts.prompt) {
                const prompt = document.createElement('div');
                prompt.className = 'question-stem';
                setFormattedText(prompt, parts.prompt, isMathSection);
                questionText.appendChild(prompt);
            }
            if (chartQuestionIds[quiz.title]?.has(question.id)) {
                const figure = document.createElement('figure');
                figure.className = 'question-chart-figure';
                const image = document.createElement('img');
                image.className = 'question-chart';
                image.src = question.image.replace(/\.jpg$/i, '-chart.jpg');
                image.alt = `Biểu đồ hoặc bảng trong đề bài câu ${question.number}`;
                image.loading = 'lazy';
                figure.appendChild(image);
                questionText.appendChild(figure);
            }
            if (parts.contextBlocks.length) {
                const context = document.createElement('div');
                context.className = 'question-context';
                if (parts.contextBlocks.length === 1 && parts.contextBlocks[0].type === 'paragraph') {
                    setFormattedText(context, parts.contextBlocks[0].text, isMathSection);
                } else {
                    let bulletList = null;
                    parts.contextBlocks.forEach(block => {
                        if (block.type === 'bullet') {
                            if (!bulletList) {
                                bulletList = document.createElement('ul');
                                bulletList.className = 'research-note-list';
                                context.appendChild(bulletList);
                            }
                            const item = document.createElement('li');
                            setFormattedText(item, block.text, isMathSection);
                            bulletList.appendChild(item);
                            return;
                        }

                        bulletList = null;
                        const line = document.createElement('div');
                        line.className = 'question-context-line';
                        setFormattedText(line, block.text, isMathSection);
                        context.appendChild(line);
                    });
                }
                questionText.appendChild(context);
            }
            questionPane.appendChild(questionText);

            const divider = document.createElement('div');
            divider.className = 'qp-divider';
            divider.setAttribute('aria-hidden', 'true');

            const answerPane = document.createElement('div');
            answerPane.className = 'qp-pane-answer';
            if (question.type === 'multiple_choice') {
                const options = document.createElement('fieldset');
                options.className = 'options answer-options';
                options.setAttribute('aria-label', 'Chọn đáp án');
                const choices = parts.options.length
                    ? parts.options
                    : ['A', 'B', 'C', 'D'].map(letter => ({ letter, text: '' }));
                choices.forEach(choice => {
                    const row = document.createElement('div');
                    row.className = 'answer-choice-row';
                    const label = document.createElement('label');
                    label.className = 'answer-option';
                    const input = document.createElement('input');
                    input.type = 'radio';
                    input.name = `question${question.id}`;
                    input.value = choice.letter;
                    const letter = document.createElement('strong');
                    letter.textContent = `${choice.letter}.`;
                    const optionText = document.createElement('span');
                    optionText.className = 'answer-option-text';
                    setFormattedText(optionText, choice.text, isMathSection);
                    if (answerChartQuestionIds[quiz.title]?.has(question.id)) {
                        const image = document.createElement('img');
                        image.className = 'answer-option-chart';
                        image.src = question.image.replace(/\.jpg$/i, `-answer-${choice.letter}.jpg`);
                        image.alt = `Hình minh họa cho đáp án ${choice.letter} của câu ${question.number}`;
                        image.loading = 'lazy';
                        optionText.appendChild(image);
                    }
                    label.append(input, letter, optionText);
                    const eliminateButton = document.createElement('button');
                    eliminateButton.className = 'eliminate-option';
                    eliminateButton.type = 'button';
                    eliminateButton.textContent = '×';
                    eliminateButton.setAttribute('aria-label', `Loại đáp án ${choice.letter}`);
                    eliminateButton.setAttribute('aria-pressed', 'false');
                    eliminateButton.addEventListener('click', () => {
                        toggleEliminatedOption(question.id, choice.letter, row, eliminateButton);
                    });
                    row.append(label, eliminateButton);
                    options.appendChild(row);
                    setEliminationState(question.id, choice.letter, row, eliminateButton);
                });
                answerPane.appendChild(options);
            } else {
                const response = document.createElement('label');
                response.className = 'response-field';
                response.innerHTML = `<span>Nhập đáp án</span><input type="text" class="fill-input" name="question${question.id}" autocomplete="off" inputmode="decimal" aria-label="Đáp án câu ${question.number}">`;
                answerPane.appendChild(response);
            }

            const feedback = document.createElement('div');
            feedback.className = 'answer-feedback';
            feedback.setAttribute('aria-live', 'polite');
            answerPane.appendChild(feedback);
            article.append(questionBar, questionPane, divider, answerPane);
            sectionElement.appendChild(article);
            questionElements.set(String(question.id), article);
            questionMetadata.set(String(question.id), {
                ...question,
                sectionIndex,
                sectionTitle: displaySectionTitles[sectionIndex]
            });
        });

        questionBank.appendChild(sectionElement);
    });

    if (quiz.sections.length > 1) {
        quiz.sections.forEach((section, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'global-check-btn section-choice';
            button.textContent = `${displaySectionTitles[index]} · ${section.questions.length} câu`;
            button.addEventListener('click', () => startSection(index));
            sectionButtons.appendChild(button);
        });
        document.getElementById('chooseSectionButton').addEventListener('click', () => {
            setup.hidden = true;
            sectionPicker.hidden = false;
        });
    } else {
        modeButtons.hidden = true;
        document.getElementById('singleSectionButton').hidden = false;
        document.getElementById('singleSectionButton').addEventListener('click', () => startSection(0));
    }

    document.getElementById('startFullButton').addEventListener('click', startFull);
    const updateQuestionFontSize = () => {
        root.style.setProperty('--bluebook-question-font-size', `${questionFontSize.value}rem`);
        document.body.style.setProperty('--qp-fs', `${questionFontSize.value}rem`);
    };
    updateQuestionFontSize();
    questionFontSize.addEventListener('input', updateQuestionFontSize);
    document.getElementById('backToModesButton').addEventListener('click', () => {
        closeLegacyPresentation();
        sectionPicker.hidden = true;
        setup.hidden = false;
    });
    previousButton.addEventListener('click', () => moveQuestion(-1));
    nextButton.addEventListener('click', () => moveQuestion(1));
    checkButton.addEventListener('click', checkSection);
    continueButton.addEventListener('click', handleContinue);
    questionNavigator.addEventListener('click', event => {
        const button = event.target.closest('[data-question-index]');
        if (!button) return;
        activeQuestionIndex = Number(button.dataset.questionIndex);
        closeNavigator();
        showQuestion();
    });

    root.addEventListener('change', event => {
        if (event.target.matches('input')) {
            clearNotice();
            saveProgress();
        }
    });
    root.addEventListener('input', event => {
        if (event.target.matches('input[type="text"]')) {
            clearNotice();
            saveProgress();
        }
    });

    restoreProgress();
    updateProgress();
    window.__saturnifyQuestionCount = totalQuestions;
    window.__saturnifyManualQuestionTiming = true;
    window.__saturnifyOnQuizReset = resetAnswers;

    function startFull() {
        mode = 'full';
        resultsSent = false;
        startedAt = new Date();
        const firstIncomplete = quiz.sections.findIndex(section =>
            section.questions.some(question => !getAnswer(question))
        );
        if (firstIncomplete === -1) {
            finishQuiz(quiz.sections.map((_, index) => index));
            return;
        }
        openSection(firstIncomplete);
    }

    function startSection(index) {
        mode = 'section';
        resultsSent = false;
        startedAt = new Date();
        openSection(index);
    }

    function openSection(index) {
        activeSectionIndex = index;
        activeQuestionIndex = 0;
        sectionChecked = false;
        setup.hidden = true;
        sectionPicker.hidden = true;
        completion.hidden = true;
        runner.hidden = false;
        openLegacyPresentation();
        continueButton.hidden = true;
        continueAction = 'next';
        checkButton.hidden = false;
        checkButton.disabled = false;
        checkHeaderButton.hidden = false;
        questionBank.querySelectorAll('.quiz-section').forEach((section, sectionIndex) => {
            section.hidden = sectionIndex !== index;
            section.querySelectorAll('.question').forEach(question => {
                question.hidden = true;
                question.classList.remove('qp-active');
                question.dataset.quizTitle = '';
                question.querySelectorAll('input').forEach(input => { input.disabled = false; });
                const feedback = question.querySelector('.answer-feedback');
                feedback.textContent = '';
                feedback.className = 'answer-feedback';
                question.querySelectorAll('.eliminate-option').forEach(button => { button.disabled = false; });
            });
        });
        const section = quiz.sections[index];
        sectionTitle.textContent = displaySectionTitles[index];
        legacyTitle.textContent = `${quiz.title} · ${displaySectionTitles[index]}`;
        navigatorModalTitle.textContent = displaySectionTitles[index].replace(/^Section\s+\d+,\s*/i, '');
        buildQuestionNavigator(section);
        clearNotice();
        showQuestion();
    }

    function showQuestion() {
        const section = quiz.sections[activeSectionIndex];
        const question = section.questions[activeQuestionIndex];
        const sectionElement = questionBank.querySelector(`[data-section-index="${activeSectionIndex}"]`);
        sectionElement.querySelectorAll('.question').forEach(item => {
            item.hidden = true;
            item.classList.remove('qp-active');
            item.dataset.quizTitle = '';
        });
        const article = questionElements.get(String(question.id));
        article.hidden = false;
        article.classList.add('qp-active');
        article.dataset.quizTitle = quiz.title;
        questionCounter.textContent = `Câu ${question.number} / ${section.questions.length}`;
        navigatorToggle.textContent = `Câu ${question.number} / ${section.questions.length} ⌃`;
        previousButton.disabled = activeQuestionIndex === 0;
        nextButton.hidden = activeQuestionIndex === section.questions.length - 1;
        checkButton.hidden = sectionChecked || activeQuestionIndex !== section.questions.length - 1;
        checkHeaderButton.hidden = sectionChecked;
        continueButton.hidden = !sectionChecked || activeQuestionIndex !== section.questions.length - 1;
        const markButton = article.querySelector('.qp-mark');
        if (markButton) {
            const isFlagged = flaggedQuestionIds.has(String(question.id));
            markButton.classList.toggle('is-flagged', isFlagged);
            markButton.setAttribute('aria-pressed', String(isFlagged));
        }
        updateQuestionNavigator(section);
        updateProgress();
        publishCurrentQuestion(section, question);
    }

    function publishCurrentQuestion(section, question) {
        window.__saturnifyCurrentQuestion = {
            number: Number(question.id),
            label: `${displaySectionTitles[activeSectionIndex]} · Câu ${question.number}/${section.questions.length}`
        };
        syncQuestionTiming();
        window.parent.postMessage({ type: 'SAT_PROGRESS_UPDATE' }, '*');
    }

    // Time only counts while a student is on an open question: not on setup/result screens,
    // while reviewing a checked section, or while the tab is in the background.
    function syncQuestionTiming() {
        const section = quiz.sections[activeSectionIndex];
        const question = section?.questions[activeQuestionIndex];
        if (!question || runner.hidden || sectionChecked || document.hidden) {
            window.__saturnifyPauseQuestionTime?.();
            return;
        }
        const flatIndex = quiz.sections.flatMap(item => item.questions).findIndex(item => item.id === question.id);
        window.__saturnifyActivateQuestion?.(flatIndex);
    }

    document.addEventListener('visibilitychange', syncQuestionTiming);

    function moveQuestion(offset) {
        const section = quiz.sections[activeSectionIndex];
        const nextIndex = activeQuestionIndex + offset;
        if (nextIndex < 0 || nextIndex >= section.questions.length) return;
        activeQuestionIndex = nextIndex;
        showQuestion();
    }

    function checkSection() {
        const section = quiz.sections[activeSectionIndex];
        const unansweredIndex = section.questions.findIndex(question => !getAnswer(question));
        if (unansweredIndex !== -1) {
            activeQuestionIndex = unansweredIndex;
            showQuestion();
            showNotice('Hãy trả lời hết câu hỏi trong phần này trước khi tiếp tục.');
            return;
        }

        sectionChecked = true;
        section.questions.forEach(question => {
            const article = questionElements.get(String(question.id));
            const isCorrect = checkAnswer(question, getAnswer(question));
            article.querySelectorAll('input').forEach(input => { input.disabled = true; });
            article.querySelectorAll('.eliminate-option').forEach(button => { button.disabled = true; });
            const feedback = article.querySelector('.answer-feedback');
            feedback.textContent = isCorrect
                ? 'Đúng'
                : `Chưa đúng. Đáp án: ${question.answers.join(' / ')}`;
            feedback.classList.toggle('is-correct', isCorrect);
            feedback.classList.toggle('is-incorrect', !isCorrect);
        });

        const score = getSectionScore(activeSectionIndex);
        showNotice(`Kết quả phần này: ${score}/${section.questions.length}`);
        checkButton.hidden = true;
        checkHeaderButton.hidden = true;
        syncQuestionTiming();
        if (mode === 'full' && activeSectionIndex < quiz.sections.length - 1) {
            continueButton.textContent = 'Sang phần tiếp theo';
            continueButton.hidden = false;
        } else {
            continueButton.textContent = mode === 'full' ? 'Xem kết quả toàn bài' : 'Xem kết quả';
            continueButton.hidden = false;
            continueAction = mode === 'full' ? 'finish-full' : 'finish-section';
        }
        saveProgress();
    }

    function handleContinue() {
        if (continueAction === 'next') {
            continueFull();
        } else if (continueAction === 'finish-full') {
            finishQuiz(quiz.sections.map((_, index) => index));
        } else {
            finishQuiz([activeSectionIndex]);
        }
    }

    function continueFull() {
        if (activeSectionIndex === quiz.sections.length - 1) {
            finishQuiz(quiz.sections.map((_, index) => index));
            return;
        }
        const nextIndex = quiz.sections.findIndex((section, index) =>
            index > activeSectionIndex && section.questions.some(question => !getAnswer(question))
        );
        if (nextIndex === -1) {
            finishQuiz(quiz.sections.map((_, index) => index));
            return;
        }
        openSection(nextIndex);
    }

    function finishQuiz(sectionIndexes) {
        const questions = sectionIndexes.flatMap(index => quiz.sections[index].questions);
        const score = questions.filter(question => checkAnswer(question, getAnswer(question))).length;
        const title = mode === 'section'
            ? `${quiz.title} — ${displaySectionTitles[activeSectionIndex]}`
            : quiz.title;

        runner.hidden = true;
        closeLegacyPresentation();
        sectionPicker.hidden = true;
        setup.hidden = true;
        completion.hidden = false;
        resultTitle.textContent = title;
        resultScore.textContent = `Điểm: ${score}/${questions.length} (${Math.round(score / questions.length * 100)}%)`;
        resultActions.replaceChildren();

        if (mode === 'section') {
            const chooseButton = document.createElement('button');
            chooseButton.type = 'button';
            chooseButton.className = 'secondary-button';
            chooseButton.textContent = 'Chọn phần khác';
            chooseButton.addEventListener('click', returnToSetup);
            resultActions.appendChild(chooseButton);
        } else {
            const setupButton = document.createElement('button');
            setupButton.type = 'button';
            setupButton.className = 'secondary-button';
            setupButton.textContent = 'Quay về chọn chế độ';
            setupButton.addEventListener('click', () => {
                completion.hidden = true;
                setup.hidden = false;
            });
            resultActions.appendChild(setupButton);
        }

        if (!resultsSent) {
            submitResult(title, questions, score);
            resultsSent = true;
        }
        saveProgress();
    }

    function submitResult(title, questions, score) {
        const studentName = sessionStorage.getItem('studentName') || 'Học sinh ẩn danh';
        const history = JSON.parse(localStorage.getItem('sat_results') || '[]');
        const answers = {};
        questions.forEach(question => {
            const value = getAnswer(question);
            const metadata = questionMetadata.get(String(question.id));
            answers[`Câu ${question.id}`] = {
                questionText: `${quiz.title} · ${metadata.sectionTitle} · Câu ${question.number}`,
                userChoice: value || 'Bỏ trống',
                correctAnswer: question.answers.join(' / '),
                isCorrect: checkAnswer(question, value)
            };
        });
        const endTime = new Date();
        const result = {
            id: Date.now(),
            studentName,
            studentId: sessionStorage.getItem('studentId') || 'N/A',
            quizTitle: title,
            attempt: history.filter(item => item.studentName === studentName && item.quizTitle === title).length + 1,
            score: `${score}/${questions.length}`,
            total: questions.length,
            percentage: `${Math.round(score / questions.length * 100)}%`,
            answers,
            startTime: startedAt.toLocaleTimeString('vi-VN') + ' ' + startedAt.toLocaleDateString('vi-VN'),
            endTime: endTime.toLocaleTimeString('vi-VN') + ' ' + endTime.toLocaleDateString('vi-VN'),
            duration: `${Math.max(0, Math.round((endTime - startedAt) / 1000))} giây`
        };
        history.push(result);
        localStorage.setItem('sat_results', JSON.stringify(history));
        window.parent.postMessage({ type: 'SAT_SUBMIT_RESULT', data: result }, '*');
    }

    function getSectionScore(sectionIndex) {
        return quiz.sections[sectionIndex].questions.filter(question =>
            checkAnswer(question, getAnswer(question))
        ).length;
    }

    function splitQuestionText(text) {
        const markerPattern = /^[ \t]*([A-Da-dАаВвСсДд])\.[ \t]*/gm;
        const markers = [...text.matchAll(markerPattern)];
        const labelMap = { 'А': 'A', 'В': 'B', 'С': 'C', 'Д': 'D' };
        const normalizedMarkers = markers.map(marker => {
            const label = marker[1].toUpperCase();
            return { marker, letter: labelMap[label] || label };
        });
        let suffixStart = normalizedMarkers.length - 1;
        const order = { A: 0, B: 1, C: 2, D: 3 };
        while (
            suffixStart > 0 &&
            order[normalizedMarkers[suffixStart - 1].letter] < order[normalizedMarkers[suffixStart].letter]
        ) {
            suffixStart -= 1;
        }
        const optionMarkers = normalizedMarkers.slice(suffixStart);
        let stem = text;
        let options = [];

        if (optionMarkers.length >= 2) {
            stem = text.slice(0, optionMarkers[0].marker.index);
            const optionTexts = new Map(optionMarkers.map(({ marker, letter }, index) => {
                const start = marker.index + marker[0].length;
                const end = optionMarkers[index + 1]?.marker.index ?? text.length;
                return [letter, text.slice(start, end).trim()];
            }));
            options = ['A', 'B', 'C', 'D'].map(letter => ({
                letter,
                text: optionTexts.get(letter) || ''
            }));
        }

        stem = stem.replace(/^\s*\d+\.\s*/, '').trim();
        const [prompt = '', ...contextLines] = stem.split(/\r?\n/);
        const preserveGap = text.includes(WORD_CHOICE_GAP_PROMPT);
        return {
            prompt: cleanOcrText(prompt, preserveGap),
            contextBlocks: buildContextBlocks(contextLines, preserveGap),
            options: options.map(option => ({ ...option, text: cleanOcrText(option.text) }))
        };
    }

    function setFormattedText(element, text, isMathSection) {
        if (!isMathSection) {
            element.textContent = text;
            return;
        }
        element.replaceChildren(...buildFormattedNodes(text));
    }

    function buildFormattedNodes(text) {
        const tokens = [];
        text.split(' ').filter(Boolean).forEach(raw => {
            const trail = (raw.match(/[,.;:?!]+$/) || [''])[0];
            const core = trail ? raw.slice(0, -trail.length) : raw;
            const compound = core.match(/^([A-Za-z]|xy|\d+(?:\.\d+)?)(-[A-Za-z]{2,}[A-Za-z)]*)$/);
            if (compound) {
                tokens.push({ raw: compound[1], core: compound[1], trail: '', math: true, glue: false });
                tokens.push({ raw: compound[2] + trail, core: compound[2], trail: '', math: false, glue: true });
            } else {
                tokens.push({ raw, core, trail, math: false, glue: false });
            }
        });
        tokens.forEach((token, index) => {
            if (!token.math) token.math = isMathToken(token.core, tokens, index);
        });
        tokens.forEach((token, index) => {
            if (token.math || !/^[a-z]{2,3}$/.test(token.core)) return;
            if (MATH_OPERATORS.has(tokens[index - 1]?.core) || MATH_OPERATORS.has(tokens[index + 1]?.core)) {
                token.math = true;
            }
        });

        const nodes = [];
        let index = 0;
        while (index < tokens.length) {
            const first = tokens[index];
            if (nodes.length && !first.glue) nodes.push(document.createTextNode(' '));
            if (!first.math) {
                nodes.push(document.createTextNode(first.raw));
                index += 1;
                continue;
            }
            let last = index;
            while (last + 1 < tokens.length && tokens[last + 1].math && !/[.?!;:]/.test(tokens[last].trail)) last += 1;
            const run = tokens.slice(index, last + 1);
            let source = run.map((token, offset) => offset === run.length - 1 ? token.core : token.raw).join(' ');
            let leading = '';
            let closing = '';
            if (source.startsWith('(') && findClosingParenthesis(source, 0) < 0) {
                leading = '(';
                source = source.slice(1);
            }
            if (source.endsWith(')') && !source.slice(0, -1).includes('(')) {
                closing = ')';
                source = source.slice(0, -1);
            }
            const math = document.createElementNS(MATHML_NS, 'math');
            math.appendChild(createMathRow(parseMathItems(source)));
            if (leading) nodes.push(document.createTextNode(leading));
            nodes.push(math);
            if (closing) nodes.push(document.createTextNode(closing));
            const trail = run[run.length - 1].trail;
            if (trail) nodes.push(document.createTextNode(trail));
            index = last + 1;
        }
        return nodes;
    }

    function isMathToken(core, tokens, index) {
        if (!core) return false;
        if (MATH_OPERATORS.has(core)) return true;
        if (!/^[A-Za-z0-9.,%°π√∠×÷+\-−=<>≤≥^/()$]+$/.test(core)) return false;
        if (/[A-Za-z0-9)]-[A-Za-z]{2,}/.test(core)) return false;
        if (/^[A-Z]{2,5}$/.test(core)) return !NON_VARIABLE_CAPITALS.has(core);
        if (/[A-Za-z]{4,}/.test(core.replace(/sin|cos|tan|log/g, ''))) return false;
        if (/^\d+(?:st|nd|rd|th)$/i.test(core) || /^\([°A-Za-z]{2,}\)$/.test(core)) return false;
        if (/^[A-Za-z]+$/.test(core)) {
            return core.length === 1 && isVariableLetter(core, tokens, index);
        }
        return /[0-9+\-−=<>≤≥^/()°π√∠×÷%$]/.test(core);
    }

    function isVariableLetter(letter, tokens, index) {
        const previous = tokens[index - 1]?.core;
        const next = tokens[index + 1]?.core;
        const after = tokens[index + 2]?.core;
        if (letter === 'I') return false;
        if (letter === 'A') return /^(?:Circle|circle|point|Point|vertex|triangle|Triangle|angle|Angle|Direction)$/.test(previous || '');
        if (letter !== 'a') return true;
        if (MATH_OPERATORS.has(previous) || MATH_OPERATORS.has(next)) return true;
        if (next === 'is' && after === 'a') return true;
        return next === 'and' && /^[b-zB-Z]$/.test(after || '');
    }

    function createMathNode(tag, text) {
        const node = document.createElementNS(MATHML_NS, tag);
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function createMathRow(items) {
        const row = createMathNode('mrow');
        items.forEach(item => row.appendChild(item));
        return row;
    }

    function findClosingParenthesis(source, start) {
        let depth = 0;
        for (let position = start; position < source.length; position += 1) {
            if (source[position] === '(') depth += 1;
            if (source[position] === ')') {
                depth -= 1;
                if (depth === 0) return position;
            }
        }
        return -1;
    }

    function createLetterNodes(letters) {
        const nodes = [];
        let rest = letters;
        while (rest) {
            const functionName = rest.match(MATH_FUNCTION_PATTERN);
            if (functionName) {
                nodes.push(createMathNode('mi', functionName[0]));
                rest = rest.slice(functionName[0].length);
            } else {
                nodes.push(createMathNode('mi', rest[0]));
                rest = rest.slice(1);
            }
        }
        return nodes;
    }

    function readMathExponent(source, start) {
        if (source[start] === '(') {
            const close = findClosingParenthesis(source, start);
            if (close > start) {
                return { node: createMathRow(parseMathItems(source.slice(start + 1, close))), end: close + 1 };
            }
        }
        const match = source.slice(start).match(/^[-−]?(?:\d+(?:\.\d+)?|[A-Za-zπ]+)/);
        if (!match) return null;
        return { node: createMathRow(parseMathItems(match[0])), end: start + match[0].length };
    }

    function readMathTerm(source, start) {
        const character = source[start];
        if (character === '√') {
            let radicand;
            let end;
            if (source[start + 1] === '(') {
                const close = findClosingParenthesis(source, start + 1);
                if (close < 0) return { nodes: [createMathNode('mo', '√')], end: start + 1 };
                radicand = parseMathItems(source.slice(start + 2, close));
                end = close + 1;
            } else {
                const word = source.slice(start + 1).match(/^[A-Za-z0-9.]+/);
                if (!word) return { nodes: [createMathNode('mo', '√')], end: start + 1 };
                radicand = parseMathItems(word[0]);
                end = start + 1 + word[0].length;
            }
            const root = createMathNode('msqrt');
            root.appendChild(createMathRow(radicand));
            return { nodes: [root], end };
        }
        if (character === '(') {
            const close = findClosingParenthesis(source, start);
            if (close < 0) return { nodes: [createMathNode('mo', '(')], end: start + 1 };
            const inner = parseMathItems(source.slice(start + 1, close));
            const opening = createMathNode('mo', '(');
            const closing = createMathNode('mo', ')');
            if (!inner.some(node => node.matches('mfrac, msqrt') || node.querySelector('mfrac, msqrt'))) {
                [opening, closing].forEach(fence => {
                    fence.setAttribute('stretchy', 'false');
                    fence.setAttribute('lspace', '0');
                    fence.setAttribute('rspace', '0');
                });
            }
            const group = createMathRow([opening, ...inner, closing]);
            let end = close + 1;
            if (source[end] === '^') {
                const exponent = readMathExponent(source, end + 1);
                if (exponent) {
                    const power = createMathNode('msup');
                    power.appendChild(group);
                    power.appendChild(exponent.node);
                    return { nodes: [power], end: exponent.end };
                }
            }
            return { nodes: [group], inner, end };
        }
        const word = source.slice(start).match(/^(?:\d+(?:,\d{3})*(?:\.\d+)?[A-Za-zπ]*|[A-Za-zπ]+)/);
        if (!word) return null;
        const number = word[0].match(/^\d+(?:,\d{3})*(?:\.\d+)?/);
        const nodes = [];
        if (number) nodes.push(createMathNode('mn', number[0]));
        nodes.push(...createLetterNodes(word[0].slice(number ? number[0].length : 0)));
        let end = start + word[0].length;
        if (source[end] === '^') {
            const exponent = readMathExponent(source, end + 1);
            if (exponent) {
                const power = createMathNode('msup');
                power.appendChild(nodes.pop());
                power.appendChild(exponent.node);
                nodes.push(power);
                end = exponent.end;
            }
        }
        return { nodes, end };
    }

    function parseMathItems(source) {
        const items = [];
        let position = 0;
        let spaced = false;
        let afterOperand = false;
        const emit = (node, isOperand) => {
            if (isOperand && afterOperand && spaced) {
                const gap = createMathNode('mspace');
                gap.setAttribute('width', '0.5em');
                items.push(gap);
            }
            items.push(node);
            afterOperand = isOperand;
            spaced = false;
        };
        const fractionPart = term => term.inner ? createMathRow(term.inner) : createMathRow(term.nodes);

        while (position < source.length) {
            const character = source[position];
            if (character === ' ') {
                spaced = true;
                position += 1;
                continue;
            }
            if (TERM_START_PATTERN.test(character)) {
                const term = readMathTerm(source, position);
                if (term) {
                    position = term.end;
                    if (source[position] === '/' && TERM_START_PATTERN.test(source[position + 1] || '')) {
                        const denominator = readMathTerm(source, position + 1);
                        if (denominator) {
                            position = denominator.end;
                            const fraction = createMathNode('mfrac');
                            fraction.appendChild(fractionPart(term));
                            fraction.appendChild(fractionPart(denominator));
                            emit(fraction, true);
                            continue;
                        }
                    }
                    if (term.inner && term.inner.length === 1 && term.inner[0].localName === 'mfrac') {
                        emit(term.inner[0], true);
                    } else {
                        term.nodes.forEach((node, offset) => emit(node, offset === term.nodes.length - 1 ? node.localName !== 'mo' : true));
                    }
                    continue;
                }
            }
            position += 1;
            if (character === ')' || character === '(') {
                emit(createMathNode('mo', character), false);
            } else if ('=<>≤≥+-−×÷,'.includes(character)) {
                const operator = createMathNode('mo', character === '-' ? '−' : character);
                if (!afterOperand && '+-−'.includes(character)) operator.setAttribute('form', 'prefix');
                emit(operator, false);
            } else if (character === '°' && /^[CF](?![A-Za-z])/.test(source.slice(position))) {
                emit(createMathNode('mtext', `°${source[position]}`), true);
                position += 1;
            } else if (character === '°' || character === '%' || character === '∠') {
                emit(createMathNode('mtext', character), character !== '∠');
            } else if (character === '$') {
                emit(createMathNode('mtext', character), false);
            } else {
                emit(createMathNode('mo', character), false);
            }
        }
        return items;
    }

    function endsSentence(text) {
        return /[.?!:"”)]$/.test(text) && !/(?:\.\.\.|…)$/.test(text);
    }

    // Bullets get their own line; a bullet that did not end its sentence continues on the next wrapped line.
    function buildContextBlocks(lines, preserveGap = false) {
        const blocks = [];
        const addText = (text, startsBullet) => {
            const cleaned = cleanOcrText(text, preserveGap);
            if (!cleaned) return;
            const last = blocks[blocks.length - 1];
            if (startsBullet) {
                blocks.push({ type: 'bullet', text: cleaned });
            } else if (last?.type === 'paragraph') {
                last.text += ` ${cleaned}`;
            } else if (last?.type === 'bullet' && !endsSentence(last.text) && (!/^[A-Z]/.test(cleaned) || cleaned.length <= 70)) {
                last.text += ` ${cleaned}`;
            } else {
                blocks.push({ type: 'paragraph', text: cleaned });
            }
        };
        lines.forEach(line => {
            const pieces = line.split('•');
            addText(pieces[0], false);
            pieces.slice(1).forEach(piece => addText(piece, true));
        });
        return blocks;
    }

    function cleanOcrText(text, preserveGap = false) {
        return String(text)
            .replace(/_+/g, match => preserveGap ? '_' : '')
            .replace(/[ \t]*\r?\n[ \t]*/g, ' ')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
    }

    function createHeaderButton(className, icon, label, ariaLabel) {
        const button = document.createElement('button');
        button.className = className;
        button.type = 'button';
        button.innerHTML = `${icon}<span class="qp-label">${label}</span>`;
        button.setAttribute('aria-label', ariaLabel);
        return button;
    }

    function createQuestionBar(question) {
        const bar = document.createElement('div');
        bar.className = 'qp-qbar';
        const number = document.createElement('span');
        number.className = 'qp-qnum';
        number.textContent = String(question.number);

        const markButton = document.createElement('button');
        markButton.className = 'qp-mark';
        markButton.type = 'button';
        markButton.innerHTML = '<svg viewBox="0 0 12 16" aria-hidden="true"><path d="M1 1h10v14L6 12 1 15z" fill="none" stroke="currentColor" stroke-width="1.5"></path></svg><span>Đánh dấu xem lại</span>';
        markButton.setAttribute('aria-label', `Đánh dấu câu ${question.number} để xem lại`);
        markButton.setAttribute('aria-pressed', String(flaggedQuestionIds.has(String(question.id))));
        markButton.classList.toggle('is-flagged', flaggedQuestionIds.has(String(question.id)));
        markButton.addEventListener('click', () => toggleQuestionFlag(question.id));
        bar.append(number, markButton);
        return bar;
    }

    function openLegacyPresentation() {
        root.classList.add('is-running');
        document.body.classList.add('quiz-paged');
        legacyHeader.hidden = false;
        legacyFooter.hidden = false;
        fontSizeControl.className = 'qp-size';
        legacyHeader.insertBefore(fontSizeControl, legacyTopbar);
        updateQuestionFontSize();
    }

    function closeLegacyPresentation() {
        window.__saturnifyPauseQuestionTime?.();
        root.classList.remove('is-running');
        document.body.classList.remove('quiz-paged');
        legacyHeader.hidden = true;
        legacyFooter.hidden = true;
        navigatorModal.hidden = true;
        navigatorToggle.setAttribute('aria-expanded', 'false');
        fontSizeControl.className = 'quiz-font-size';
        fontSizeControlHome.appendChild(fontSizeControl);
        document.body.style.removeProperty('--qp-fs');
    }

    function closeNavigator() {
        navigatorModal.hidden = true;
        navigatorToggle.setAttribute('aria-expanded', 'false');
        navigatorToggle.focus();
    }

    function showLegacyToast(message) {
        const toast = document.createElement('div');
        toast.className = 'qp-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = message;
        document.body.appendChild(toast);
        window.setTimeout(() => toast.remove(), 2200);
    }

    function exitToSetup() {
        saveProgress();
        runner.hidden = true;
        completion.hidden = true;
        sectionPicker.hidden = true;
        setup.hidden = false;
        closeLegacyPresentation();
    }

    function resetAnswers() {
        questionBank.querySelectorAll('input').forEach(input => {
            input.disabled = false;
            if (input.type === 'radio') input.checked = false;
            else input.value = '';
        });
        questionBank.querySelectorAll('.answer-choice-row').forEach(row => {
            row.classList.remove('is-eliminated');
            row.querySelector('.eliminate-option')?.setAttribute('aria-pressed', 'false');
        });
        questionBank.querySelectorAll('.answer-feedback').forEach(feedback => {
            feedback.textContent = '';
            feedback.className = 'answer-feedback';
        });
        eliminatedOptions = Object.create(null);
        localStorage.removeItem(storageKey);
        localStorage.removeItem(`${storageKey}_total`);
        localStorage.removeItem(eliminationStorageKey);
        updateProgress();
        if (!runner.hidden) openSection(activeSectionIndex);
    }

    function buildQuestionNavigator(section) {
        questionNavigator.replaceChildren();
        section.questions.forEach((question, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'qp-nav-question';
            button.textContent = String(question.number);
            button.setAttribute('aria-label', `Câu ${question.number}`);
            button.dataset.questionIndex = String(index);
            questionNavigator.appendChild(button);
        });
        updateQuestionNavigator(section);
    }

    function updateQuestionNavigator(section) {
        questionNavigator.querySelectorAll('[data-question-index]').forEach(button => {
            const index = Number(button.dataset.questionIndex);
            const question = section.questions[index];
            const answered = Boolean(getAnswer(question));
            const isCurrent = index === activeQuestionIndex;
            const isFlagged = flaggedQuestionIds.has(String(question.id));
            button.classList.toggle('qp-current', isCurrent);
            button.classList.toggle('qp-answered', answered);
            button.classList.toggle('qp-flagged', isFlagged);
            if (isCurrent) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
            button.setAttribute('aria-label', `Câu ${question.number}${answered ? ', đã trả lời' : ''}${isFlagged ? ', đã đánh dấu xem lại' : ''}`);
        });
    }

    function toggleQuestionFlag(questionId) {
        const key = String(questionId);
        if (flaggedQuestionIds.has(key)) flaggedQuestionIds.delete(key);
        else flaggedQuestionIds.add(key);
        localStorage.setItem(flagStorageKey, JSON.stringify([...flaggedQuestionIds]));
        updateQuestionNavigator(quiz.sections[activeSectionIndex]);
        const markButton = questionElements.get(key)?.querySelector('.qp-mark');
        if (markButton) {
            const isFlagged = flaggedQuestionIds.has(key);
            markButton.classList.toggle('is-flagged', isFlagged);
            markButton.setAttribute('aria-pressed', String(isFlagged));
        }
    }

    function loadFlaggedQuestions() {
        const stored = localStorage.getItem(flagStorageKey);
        if (!stored) return new Set();
        try {
            const parsed = JSON.parse(stored);
            if (!Array.isArray(parsed)) throw new Error('Dữ liệu đánh dấu câu hỏi không hợp lệ.');
            return new Set(parsed.map(String));
        } catch (error) {
            console.error('Không thể khôi phục câu hỏi đã đánh dấu:', error);
            return new Set();
        }
    }

    function toggleEliminatedOption(questionId, letter, row, button) {
        const key = String(questionId);
        const options = new Set(eliminatedOptions[key] || []);
        if (options.has(letter)) {
            options.delete(letter);
        } else {
            options.add(letter);
        }
        if (options.size) {
            eliminatedOptions[key] = [...options];
        } else {
            delete eliminatedOptions[key];
        }
        setEliminationState(questionId, letter, row, button);
        localStorage.setItem(eliminationStorageKey, JSON.stringify(eliminatedOptions));
    }

    function setEliminationState(questionId, letter, row, button) {
        const isEliminated = (eliminatedOptions[String(questionId)] || []).includes(letter);
        row.classList.toggle('is-eliminated', isEliminated);
        button.setAttribute('aria-pressed', String(isEliminated));
    }

    function loadEliminatedOptions() {
        const stored = localStorage.getItem(eliminationStorageKey);
        if (!stored) return {};
        try {
            const parsed = JSON.parse(stored);
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                throw new Error('Dữ liệu loại đáp án không hợp lệ.');
            }
            const validOptions = Object.create(null);
            Object.entries(parsed).forEach(([questionId, letters]) => {
                if (Array.isArray(letters)) {
                    validOptions[questionId] = letters.filter(letter => ['A', 'B', 'C', 'D'].includes(letter));
                }
            });
            return validOptions;
        } catch (error) {
            console.error('Không thể khôi phục đáp án đã loại:', error);
            return {};
        }
    }

    function getDisplaySectionTitles() {
        const titles = quiz.sections.map(section => section.title.replace(/,\s*Difficulty\s*:\s*.*$/i, '').trim());
        const totals = titles.reduce((counts, title) => counts.set(title, (counts.get(title) || 0) + 1), new Map());
        const occurrences = new Map();
        return titles.map(title => {
            if (totals.get(title) === 1) return title;
            const occurrence = (occurrences.get(title) || 0) + 1;
            occurrences.set(title, occurrence);
            return `${title} · Bộ ${occurrence}`;
        });
    }

    function getAnswer(question) {
        const article = questionElements.get(String(question.id));
        if (question.type === 'multiple_choice') {
            return article.querySelector('input[type="radio"]:checked')?.value || '';
        }
        return article.querySelector('input[type="text"]')?.value.trim() || '';
    }

    function checkAnswer(question, value) {
        if (!value) return false;
        if (question.type === 'multiple_choice') {
            return question.answers.some(answer => String(answer).trim().toUpperCase() === value.trim().toUpperCase());
        }
        const actualNumber = numericValue(value);
        return question.answers.some(answer => {
            const expectedNumber = numericValue(answer);
            if (actualNumber !== null && expectedNumber !== null) {
                return Math.abs(actualNumber - expectedNumber) < 1e-8;
            }
            return normalize(value) === normalize(answer);
        });
    }

    function numericValue(value) {
        const normalized = String(value).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
        const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
        if (fraction) {
            const denominator = Number(fraction[2]);
            return denominator === 0 ? null : Number(fraction[1]) / denominator;
        }
        const number = Number(normalized.replace(/,/g, ''));
        return normalized && Number.isFinite(number) ? number : null;
    }

    function normalize(value) {
        return String(value).trim().toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, '');
    }

    function restoreProgress() {
        const stored = localStorage.getItem(storageKey);
        if (!stored) return;
        try {
            const answers = JSON.parse(stored);
            Object.entries(answers).forEach(([name, value]) => {
                const input = [...root.querySelectorAll('input')].find(item => item.name === name);
                if (!input) return;
                if (input.type === 'radio') {
                    input.checked = input.value === String(value);
                } else {
                    input.value = String(value);
                }
            });
        } catch (error) {
            console.error('Không thể khôi phục tiến độ Bluebook:', error);
        }
    }

    function saveProgress() {
        const answers = {};
        questionBank.querySelectorAll('.question').forEach(article => {
            const checked = article.querySelector('input[type="radio"]:checked');
            const text = article.querySelector('input[type="text"]');
            const input = checked || text;
            if (input && input.value.trim()) answers[input.name] = input.value.trim();
        });
        localStorage.setItem(storageKey, JSON.stringify(answers));
        localStorage.setItem(`${storageKey}_total`, String(totalQuestions));
        window.parent.postMessage({ type: 'SAT_PROGRESS_UPDATE' }, '*');
        updateProgress();
        updateQuestionNavigator(quiz.sections[activeSectionIndex]);
    }

    function updateProgress() {
        const answered = [...questionBank.querySelectorAll('.question')].filter(article =>
            article.querySelector('input[type="radio"]:checked') ||
            article.querySelector('input[type="text"]')?.value.trim()
        ).length;
        progressText.textContent = `${answered}/${totalQuestions} câu đã trả lời`;
        progressBar.style.width = `${totalQuestions ? answered / totalQuestions * 100 : 0}%`;
    }

    function returnToSetup() {
        closeLegacyPresentation();
        runner.hidden = true;
        completion.hidden = true;
        sectionPicker.hidden = false;
        if (quiz.sections.length === 1) {
            sectionPicker.hidden = true;
            setup.hidden = false;
        }
    }

    function showNotice(message, isError = false) {
        notice.textContent = message;
        notice.className = isError ? 'notice is-error' : 'notice';
        notice.hidden = false;
    }

    function clearNotice() {
        notice.hidden = true;
        notice.textContent = '';
    }

    function escapeAttribute(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }
})();
