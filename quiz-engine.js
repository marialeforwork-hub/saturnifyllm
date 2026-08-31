// quiz-engine.js - Hệ thống điều hướng & Lưu kết quả bài tập SAT
(function () {
    let startTime = new Date();

    window.addEventListener('DOMContentLoaded', () => {
        setupQuizEnvironment();
    });

    function setupQuizEnvironment() {
        const blocks = document.querySelectorAll('.question-block');
        if (!blocks.length) return;

        // 1. Tạo Hộp Chọn Câu (Navigator Box) cố định ở góc phải màn hình
        let navBox = document.createElement('div');
        navBox.id = 'quizNavBox';
        navBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 210px;
            max-height: 75vh;
            background: #ffffff;
            border: 2px solid #3498db;
            border-radius: 10px;
            padding: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 9999;
            overflow-y: auto;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        `;

        // Tiêu đề Hộp Chọn Câu
        const title = document.createElement('div');
        title.innerText = '📌 Danh Sách Câu Hỏi';
        title.style.cssText = 'font-weight: bold; color: #2c3e50; font-size: 0.9em; text-align: center; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 5px;';
        navBox.appendChild(title);

        // Lưới hiển thị ô chọn câu
        const grid = document.createElement('div');
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;';

        blocks.forEach((block, index) => {
            const qNum = index + 1;
            block.id = `q_${qNum}`;
            block.style.scrollMarginTop = '30px';

            // Tạo ô vuông chọn câu
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'nav-square-btn';
            btn.id = `nav_btn_${qNum}`;
            btn.innerText = qNum;
            btn.style.cssText = `
                width: 100%;
                height: 32px;
                border: 1px solid #bdc3c7;
                background: #f8f9fa;
                color: #2c3e50;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 0.85em;
                transition: all 0.2s ease;
            `;

            // Bấm vào ô -> Nhảy thẳng đến câu đó
            btn.onclick = () => {
                block.scrollIntoView({ behavior: 'smooth' });
            };
            grid.appendChild(btn);

            // Tự động đổi sang màu xanh lá khi học sinh chọn đáp án
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

        // 2. Gắn đè sự kiện nút Nộp bài để xử lý lưu dữ liệu
        const submitBtn = document.querySelector('button[onclick*="submit"], .btn-submit');
        if (submitBtn) {
            submitBtn.onclick = null;
            submitBtn.addEventListener('click', handleGlobalSubmit);
        }
    }

    // 3. Hàm tính điểm, ghi nhận thời gian và gửi về cho trang Admin
    function handleGlobalSubmit() {
        const endTime = new Date();
        const durationSec = Math.round((endTime - startTime) / 1000);
        const durationMin = (durationSec / 60).toFixed(1);

        // Tự động lấy tên học sinh từ phiên đăng nhập
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

        // Thống kê kết quả lựa chọn từng câu
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

        // Đọc lịch sử để đếm số lần làm bài
        let history = JSON.parse(localStorage.getItem('sat_results') || '[]');
        const attempt = history.filter(h => h.studentName === studentName && h.quizTitle === quizTitle).length + 1;

        // Tạo gói dữ liệu kết quả đầy đủ
        const resultData = {
            id: Date.now(),
            studentName: studentName,
            quizTitle: quizTitle,
            attempt: attempt,
            score: `${score}/${blocks.length}`,
            percentage: Math.round((score / blocks.length) * 100) + '%',
            answers: studentAnswers,
            startTime: startTime.toLocaleTimeString('vi-VN') + ' ' + startTime.toLocaleDateString('vi-VN'),
            endTime: endTime.toLocaleTimeString('vi-VN') + ' ' + endTime.toLocaleDateString('vi-VN'),
            duration: `${durationMin} phút (${durationSec}s)`
        };

        // Lưu vào bộ nhớ local
        history.push(resultData);
        localStorage.setItem('sat_results', JSON.stringify(history));

        // Bắn dữ liệu ra trang chính (index.html) để đồng bộ dữ liệu vào Admin
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'SAT_SUBMIT_RESULT', data: resultData }, '*');
        }

        alert(`🎉 Đã nộp bài thành công!\n\nKết quả: ${score}/${blocks.length}\nThời gian làm bài: ${durationMin} phút`);
    }
})();
