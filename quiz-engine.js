// quiz-engine.js
(function () {
    let startTime = new Date();

    window.addEventListener('DOMContentLoaded', () => {
        setupQuizEnvironment();
    });

    function setupQuizEnvironment() {
        const blocks = document.querySelectorAll('.question-block');
        if (!blocks.length) return;

        // Tạo Hộp Chọn Câu
        let navBox = document.createElement('div');
        navBox.id = 'quizNavBox';
        navBox.style.cssText = 'position: fixed; top: 20px; right: 20px; width: 200px; max-height: 75vh; background: #ffffff; border: 2px solid #3498db; border-radius: 10px; padding: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9999; overflow-y: auto; font-family: sans-serif;';

        const title = document.createElement('div');
        title.innerText = '📌 Danh Sách Câu Hỏi';
        title.style.cssText = 'font-weight: bold; color: #2c3e50; font-size: 0.9em; text-align: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px;';
        navBox.appendChild(title);

        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px;';

        blocks.forEach((block, index) => {
            const qNum = index + 1;
            block.id = `q_${qNum}`;
            block.style.scrollMarginTop = '30px';

            const btn = document.createElement('button');
            btn.type = 'button';
            btn.id = `nav_btn_${qNum}`;
            btn.innerText = qNum;
            btn.style.cssText = 'width: 100%; height: 30px; border: 1px solid #ccc; background: #f8f9fa; color: #333; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 0.8em;';

            btn.onclick = () => { block.scrollIntoView({ behavior: 'smooth' }); };
            grid.appendChild(btn);

            const inputs = block.querySelectorAll('input[type="radio"]');
            inputs.forEach(input => {
                input.addEventListener('change', () => {
                    btn.style.background = '#2ecc71';
                    btn.style.color = '#ffffff';
                    btn.style.borderColor = '#27ae60';
                });
            });
        });

        navBox.appendChild(grid);
        document.body.appendChild(navBox);

        // Gắn nút Nộp Bài
        const submitBtn = document.querySelector('button[onclick*="submit"], .btn-submit');
        if (submitBtn) {
            submitBtn.onclick = null;
            submitBtn.addEventListener('click', handleGlobalSubmit);
        }
    }

    function handleGlobalSubmit() {
        const endTime = new Date();
        const durationSec = Math.round((endTime - startTime) / 1000);
        const durationMin = (durationSec / 60).toFixed(1);

        let studentName = sessionStorage.getItem('studentName');
        if (!studentName && window.parent) {
            try { studentName = window.parent.sessionStorage.getItem('studentName'); } catch (e) {}
        }
        if (!studentName) studentName = 'Học sinh';

        const quizTitle = document.title || 'Bài tập SAT';
        const blocks = document.querySelectorAll('.question-block');
        
        let score = 0;
        let studentAnswers = {};
        const answersKey = typeof correctAnswers !== 'undefined' ? correctAnswers : {};

        blocks.forEach((block, index) => {
            const qNum = index + 1;
            const checked = block.querySelector('input[type="radio"]:checked');
            const userChoice = checked ? checked.value : "Bỏ trống";
            studentAnswers[`Câu ${qNum}`] = userChoice;

            const correct = answersKey[`q${qNum}`] || answersKey[qNum];
            if (correct && userChoice === correct) {
                score++;
            }
        });

        const resultData = {
            id: Date.now(),
            studentName: studentName,
            quizTitle: quizTitle,
            score: `${score}/${blocks.length}`,
            percentage: Math.round((score / blocks.length) * 100) + '%',
            answers: studentAnswers,
            startTime: startTime.toLocaleTimeString('vi-VN') + ' ' + startTime.toLocaleDateString('vi-VN'),
            endTime: endTime.toLocaleTimeString('vi-VN') + ' ' + endTime.toLocaleDateString('vi-VN'),
            duration: `${durationMin} phút (${durationSec}s)`
        };

        // Gửi kết quả ra trang index.html
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'SAT_SUBMIT_RESULT', data: resultData }, '*');
        } else {
            let history = JSON.parse(localStorage.getItem('sat_results') || '[]');
            history.push(resultData);
            localStorage.setItem('sat_results', JSON.stringify(history));
        }

        alert(`🎉 Đã nộp bài thành công!\n\nKết quả: ${score}/${blocks.length}\nThời gian: ${durationMin} phút`);
    }
})();
