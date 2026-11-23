(function () {
    const raw = String.raw;
    const figure = (src, alt) =>
        `<figure class="prepx-figure"><img src="${src}" alt="${alt}" loading="lazy"></figure>`;
    const table = (headers, rows) =>
        `<div class="prepx-table-wrap"><table class="prepx-table"><thead><tr>${headers.map(cell => `<th scope="col">${cell}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((cell, index) => index ? `<td>${cell}</td>` : `<th scope="row">${cell}</th>`).join('')}</tr>`).join('')}</tbody></table></div>`;

    const quizzes = {
        '2': [
            { prompt: raw`In the given equation, \( -x^2 + bx - 64 = 0 \), \(b\) is an integer. The equation has no real solutions. What is the least possible value of \(b\)?`, answer: '-15' },
            { prompt: raw`A beekeeper’s initial observation of the population of a certain bee colony was 1,100 bees. The beekeeper set a goal to increase the population to 2,600 bees. A model predicts that the population begins at 1,100 and increases by 120 bees per week in the first two weeks after the initial observation, then increases by 180 bees per week until the goal is reached. At the end of week \(w\) after the initial observation, where \(w&gt;2\), which function gives the predicted number of bees still needed to reach the goal?`, options: [raw`\(p(w)=2{,}600-180w\)`, raw`\(p(w)=2{,}480+180w\)`, raw`\(p(w)=1{,}620-180w\)`, raw`\(p(w)=-120+180w\)`], answer: 'C' },
            { prompt: raw`A landscaping company mixes oil with gasoline to power its tools. A chainsaw requires 8 ounces of oil per gallon of gasoline, and a lawnmower requires 4 ounces per gallon. The company uses 21 ounces of oil in total. Which equation represents this situation, where \(x\) and \(y\) are the gallons of gasoline in the chainsaw and lawnmower mixes, respectively?`, options: [raw`\(2(x+2y)=21\)`, raw`\(2(2x+y)=21\)`, raw`\(4(x+2y)=21\)`, raw`\(4(2x+y)=21\)`], answer: 'D' },
            { prompt: raw`A rectangular pool is surrounded by a concrete path that is \(x\) feet wide on all sides. The pool is 21 feet long and 13 feet wide. The path has area 240 square feet. What is \(x\)?` + figure('PREPX_2_images/q4-pool.png', 'Diagram of a rectangular pool surrounded by a path of width x'), options: ['3', '6', '20', '40'], answer: 'A' },
            { prompt: raw`A square map has side length 30 inches, and 1 inch represents 17 miles. A smaller square version has a side length 65% shorter than the original. On the smaller map, which is closest to the actual distance represented by 1 inch?`, options: ['5.95', '10.30', '19.50', '48.57'], answer: 'D' },
            { prompt: raw`The function \(h\) is defined by \(h(x)=-\sqrt{x^2+bx+c}\), where \(b\) and \(c\) are constants. Its graph contains \((2,0)\) and \((0,-\sqrt{358})\). If \(h(m)=0\), what is the greatest possible value of \(m\)?`, answer: '179' },
            { prompt: raw`The function \(f\) is defined by \(f(x)=\frac{|x|}{a}-14\), where \(a&lt;0\). What is the product \(f(15a)f(8a)\)?`, answer: '638' },
            { prompt: raw`The table shows two values of \(x\) and their corresponding values of \(y\), where \(s\) is a constant. There is a linear relationship between \(x\) and \(y\). Which equation represents this relationship?` + table(['\(x\)', '\(y\)'], [['\(-2s\)', '17'], ['\(-s\)', '14']]), options: [raw`\(sx+3y=11s\)`, raw`\(3x+sy=11s\)`, raw`\(3x+sy=11\)`, raw`\(sx+3y=11\)`], answer: 'B' },
            { prompt: raw`Right rectangular prism X is similar to right rectangular prism Y. Their surface areas are 59 cm² and 1,475 cm², respectively. Prism Y has volume 1,500 cm³. What is the sum of their volumes, in cm³?`, answer: '1512' },
            { prompt: raw`To investigate the effect of magnesium supplementation on adults’ sleep quality, a researcher selected 190 adults at random from a community center. The researcher measured each participant’s sleep efficiency, then randomly assigned each participant to take a magnesium supplement or a placebo each day for 6 weeks. At the end of 6 weeks, sleep efficiency was measured again, and the supplement was found to cause statistically significant improved sleep quality for adults at the community center. What feature of the study allowed this causal conclusion?`, options: ['There were more than 100 participants in the study.', 'Participants were selected at random from the community center.', 'Sleep efficiency was measured again at the end of 6 weeks.', 'Each participant was randomly assigned to take a magnesium supplement or a placebo.'], answer: 'D' },
            { prompt: raw`The histogram shows points scored per game in a team’s last 50 games. The team scores 18 points in the next game, which is added to the data set. Which statement(s) must be true? I. The new median is less than the original median. II. The new mean is less than the original mean.` + figure('PREPX_2_images/q11-histogram.png', 'Histogram of points scored per game in 50 games'), options: ['I only', 'II only', 'I and II', 'Neither I nor II'], answer: 'B' },
            { prompt: raw`The functions \(f\) and \(g\) are defined by the equations below, where \(a\) and \(b\) are integers with \(a&lt;b&lt;0\). If \(y=f(x)\) and \(y=g(x)\) are graphed in the \(xy\)-plane, which equation displays, as a constant or coefficient, the \(y\)-coordinate of the \(y\)-intercept of its graph? I. \(f(x)=a(4.2)^{x+b}\)  II. \(g(x)=a(4.2)^x+b\)`, options: ['I only', 'II only', 'I and II', 'Neither I nor II'], answer: 'D' },
            { prompt: raw`For each real number \(r\), which point lies on the graph of each equation in the system \(5x+4y=3\) and \(15x+12y=9\)?`, options: [raw`\(\left(r,-\frac{5r}{4}+\frac34\right)\)`, raw`\(\left(r,\frac{5r}{4}+\frac34\right)\)`, raw`\(\left(-\frac{4r}{5}+\frac35,r\right)\)`, raw`\(\left(\frac r3+3,-\frac r3+9\right)\)`], answer: 'C' },
            { prompt: raw`In triangles \(ABC\) and \(DEF\), \(AB=DE=10\) inches and \(\angle A=\angle D=40^\circ\). Which additional information is sufficient to prove the triangles congruent? I. \(\angle B=\angle C\). II. \(AC=DF\). III. \(BC=EF\).`, options: ['I is sufficient, but II and III are not.', 'II is sufficient, but I and III are not.', 'III is sufficient, but I and II are not.', 'II and III are sufficient, but I is not.'], answer: 'B' },
            { prompt: raw`A machine makes 8-inch, 5-inch, and 7-inch parts. It makes \(3n\) 8-inch parts, \(n\) 5-inch parts, and 12 7-inch parts. If it makes 100 parts total, which equation represents the situation?`, options: [raw`\(8(3n)+5n+7(12)=100\)`, raw`\(8n+5n+7n=100\)`, raw`\(3n+12=100\)`, raw`\(4n+12=100\)`], answer: 'D' },
            { prompt: raw`Which expression has a factor of \(2x+3b\), where \(b\) is a positive integer constant?`, options: [raw`\(4x^2+10x+9b\)`, raw`\(4x^2+21x+18b\)`, raw`\(4x^2+24x+18b\)`, raw`\(4x^2+33x+18b\)`], answer: 'C' },
            { prompt: raw`The function is \(f(x)=15b^x\), where \(b&gt;0\). For every increase of \(x\) by 1, \(f(x)\) increases by \(c\%\), with \(0&lt;c&lt;100\). Which expression gives \(c\) in terms of \(b\)?`, options: [raw`\(1+\frac b{100}\)`, raw`\(b+100\)`, raw`\(100(b+1)\)`, raw`\(100(b-1)\)`], answer: 'D' },
            { prompt: raw`The mass of object A is 483% of the mass of object B, and the mass of object A is 0.069% of the mass of object C. If object C is \(p\%\) of object B, what is \(\frac{p}{1{,}000}\)?`, answer: '700' },
            { prompt: raw`The number of undergraduate students surveyed was 6,950% of the number of postdoctoral students. The number of graduate students was 35% of the undergraduate total. If 4,865 graduate students were surveyed, what was the sum of the undergraduate and postdoctoral counts?`, answer: '14100' },
            { prompt: raw`A line intersects two parallel lines. One acute angle measures \((9x-490)^\circ\). The sum of one acute angle and three obtuse angles is \((-18x+w)^\circ\). What is \(w\)?`, answer: '1520' },
            { prompt: raw`A right square pyramid has total surface area 36,864 square inches. Its four lateral faces have a combined area of 20,480 square inches. What is its height, in inches?`, options: ['48', '64', '80', '128'], answer: 'A' },
            { prompt: raw`The equation \(2x^2+2y^2+tx+ty-78=0\), where \(t>0\), defines a circle with radius \(\sqrt{41}\). What is \(t\)?`, answer: '4' },
            { prompt: raw`A company surveyed employees in departments A, B, and C to understand their average daily time spent working remotely and overall job satisfaction. The company randomly selected 2,500 employees across several regional offices in the United States. Employees categorized their daily remote-work hours as less than 2 hours, between 2 and 5 hours, or more than 5 hours. If the results show a connection between remote-work time and job satisfaction, what factor would limit applying the findings to all employees in departments A, B, and C across the entire company?`, options: ['Employees came from multiple regional offices.', 'The sample size was too small.', 'There were more employees from departments B and C than from department A.', 'Employees were not randomly chosen from all departments A, B, and C throughout the company.'], answer: 'D' },
            { prompt: raw`Point \(M=(1,0)\) and point \(N\) lie on a unit circle centered at \(C=(0,0)\). The counterclockwise measure of \(\angle MCN\) is \(\frac{385\pi}{6}\) radians. If \(N=(p,q)\), what is \(q\)?`, options: [raw`\(-\frac12\)`, raw`\(\frac{\sqrt3}{2}\)`, raw`\(-\frac{\sqrt3}{2}\)`, raw`\(\frac12\)`], answer: 'D' },
            { prompt: raw`Which equation correctly gives \(x\) in terms of \(a,b,c,\) and 10? \(\frac1x=\frac1a+\frac1b+\frac1c+\frac1{10}\)`, options: [raw`\(x=\frac{10abc}{a+b+c+10}\)`, raw`\(x=\frac{abc+10}{a+b+c+10}\)`, raw`\(x=\frac{10abc}{10ab+10ac+10bc+abc}\)`, raw`\(x=a+b+c+10\)`], answer: 'C' },
            { prompt: raw`20% of a collection of books are nonfiction. Of the fiction books, 55% are mysteries and the rest are romance. If there are 1,224 romance books, how many books are in the collection?`, answer: '3400' },
            { prompt: raw`A linear model estimates a city’s population at 53 thousand in 1992 and 224 thousand in 2012. What population, in thousands, does the model estimate for 2016?`, answer: '258' },
            { prompt: raw`The scatterplot shows data set P and its line of best fit. Data set Q is created by adding 649 to every \(x\)-value in P. Which equation could be a line of best fit for Q?` + figure('PREPX_2_images/q28-scatterplot.png', 'Scatterplot with a line of best fit'), options: [raw`\(y=28+\frac{35}{1{,}301}x\)`, raw`\(y=18+\frac1{131}x\)`, raw`\(y=9+\frac1{131}x\)`, raw`\(y=-6+\frac{35}{1{,}301}x\)`], answer: 'D' },
            { prompt: raw`The function is \(f(x)=(r-s)x^2-(s-r)x+rs\), where \(r\) and \(s\) are positive constants. Its graph intersects the \(x\)-axis at \((a,0)\) and \((b,0)\). What is \(a+b\)?`, answer: '-1' },
            { prompt: raw`The equation \((x-5)^2+(y+12)^2=169\) represents a circle. If \((r,s)\) lies on the circle, which point could NOT be \((r,s)\)?`, options: [raw`\((-7,-7)\)`, raw`\((10,-24)\)`, raw`\((\sqrt{140}+5,\sqrt{29}-12)\)`, raw`\((\sqrt{140}-5,\sqrt{29}+12)\)`], answer: 'D' },
            { prompt: raw`A circle has center \(G\). Segments \(MH\) and \(NH\) are tangent at \(M\) and \(N\). The radius is 168 millimeters, and quadrilateral \(GMHN\) has perimeter 3,856 millimeters. What is the distance \(GH\), in millimeters?`, options: ['168', '1,752', '1,760', '1,768'], answer: 'D' },
            { prompt: raw`A polygon has 57 sides. Each interior angle measures \((180p)^\circ\). What is \(p\)?`, answer: '55/57' },
            { prompt: raw`The roots of \(x^2+10x+23=0\) are \(r&lt;s\). The roots of \(x^2+10x+17=0\) are \(t&lt;u\). The roots of \(x^2+20x-c=0\) are \(r+u\) and \(s+t\). What is \(c\)?`, answer: '-98' },
            { prompt: raw`A young swamp buffalo has 128.2 kilograms of muscle, about 64.4% of its composition. Of the remaining composition, about 44.2% is bone. To the nearest tenth, how many kilograms of the buffalo’s composition are bone?`, answer: '31.3' },
            { prompt: raw`The function \(f\) is defined by \(f(x)=\frac{x^2+ax+b}{2x+c}\). Its graph does not intersect the line \(x=3\). If \(f(5)=f(6)=0\), what is \(a+b+c\)?`, answer: '13' }
        ],
        '3': [
            { prompt: raw`The quadratic functions are \(f(x)=ax^2+36x+c\) and \(k(x)=px^2-57x+q\). Their vertex \(y\)-coordinates are \(3m\) and \(m\), respectively, where \(m&gt;0\). If \(f(10)=f(14)\) and \(k(-3)=k(27)\), for how many values of \(x\) does \(f(x)=k(x)\)?`, options: ['Exactly one', 'Exactly two', 'Infinitely many', 'Zero'], answer: 'B' },
            { prompt: raw`The vertex of \(f(x)\) is \((9,-13)\), and \((3,-4)\) lies on its graph. If \(h(x)=4f(x-2)\), what is \(h(0)-2f(0)\)?`, answer: '109/2' },
            { prompt: raw`Which function(s) have a minimum value of \(-3\)? I. \(f(x)=-6(3)^x-3\) II. \(g(x)=-3(6)^x\)`, options: ['I only', 'II only', 'I and II', 'Neither I nor II'], answer: 'D' },
            { prompt: raw`A quadratic function estimates daylight \(d(t)\), in hours, \(t\) months after March 1, for \(0\leq t\leq7\). The estimate is 12.66 hours at \(t=6\), and the maximum is 13.91 hours at \(t=3.5\). Based on the function, what is the estimated daylight on March 1?`, answer: '11.46' },
            { prompt: raw`For each real number \(r\), which point lies on the graph of each equation in the system \(5x+4y=3\) and \(15x+12y=9\)?`, options: [raw`\(\left(r,-\frac{5r}{4}+\frac34\right)\)`, raw`\(\left(r,\frac{5r}{4}+\frac34\right)\)`, raw`\(\left(-\frac{4r}{5}+\frac35,r\right)\)`, raw`\(\left(\frac r3+3,-\frac r3+9\right)\)`], answer: 'C' },
            { prompt: raw`The function \(f(x)=ax^2+bx+c\) satisfies \(f(-11)=f(-1)\). If \(b\) is an integer less than \(-3\), what is the greatest possible value of \(a+b\)?`, answer: '-13/3' },
            { prompt: raw`The function is \(f(x)=5(0.92)^{3x}\). It can be rewritten as \(f(x)=5\left(1-\frac{p}{100}\right)^x\). Which value is closest to \(p\)?`, options: ['8', '12', '22', '24'], answer: 'C' },
            { prompt: raw`In the equation \(nx^2-16x=26x^2-8\), \(n\) is an integer. If the equation has two distinct real solutions, what is the greatest possible value of \(n\)?`, answer: '33' },
            { prompt: raw`For \(x\geq0\), \(f(x)=k^3(k^x)+b\), where \(k,b&gt;0\) and \(k&lt;1\). Which statement(s) must be true? I. The maximum value is displayed as a constant or coefficient. II. \(f(1)=f(0)\cdot k\). III. \(f(a)&lt;b\) for some \(a&gt;0\).`, options: ['I only', 'II and III only', 'I and III only', 'Neither I, II, nor III'], answer: 'D' },
            { prompt: raw`A quadratic model gives an object’s height above ground. It starts at height 0 and reaches a maximum of 207.36 feet at 3.6 seconds. At what other possible time(s) is its height 184.32 feet?`, answer: ['2.4', '4.8'] },
            { prompt: raw`For a certain type of rope, \(y=900ax^2\) estimates breaking strength \(y\), in pounds, from circumference \(x\), in inches. A 1.75-inch rope has estimated strength 3,858.75 pounds. What is the estimated strength of a 3.50-inch rope?`, answer: '15435' },
            { prompt: raw`One solution of \(80x^2+80x=-10\) can be written as \(\frac{-8-k\sqrt2}{16}\), where \(k>0\). What is \(k\)?`, answer: '4' },
            { prompt: raw`The function \(g(x)=x^3+ax^2+bx+c\) has zeros \(-2,-7,\) and 3. What is \(a\)?`, options: ['−42', '−6', '6', '42'], answer: 'C' },
            { prompt: raw`The expression \(57x^{18}+bx^9+34\) is equivalent to \((3x^9+q)(rx^9+2)\), where \(q\) and \(r\) are constants. What is \(b\)?`, answer: '329' },
            { prompt: raw`In \((x-k)^2=(k-5a)(x-k)\), \(a\) and \(k\) are constants with \(k>5a\). The sum of the solutions is \(3k+21\). What is \(a\)?`, answer: '-21/5' },
            { prompt: raw`A right square pyramid has total surface area 28,160 square inches. Its four lateral faces have a combined area of 16,060 square inches. What is its height, in inches?`, answer: '48' },
            { prompt: raw`The system \(\frac{3a}{8}x=\frac23+\frac{15}{8}y\) and \(\frac{18}{7}y-4=\frac{4b}{7}x-9\) has no solution. If \(b\) is \(p\%\) less than \(a\), what is \(p\)?`, answer: '10' },
            { prompt: raw`The polynomial is \(f(x)=-(x+a)^2(x-b)(x-c)\), where \(a,b,c&gt;0\) and \(b&lt;k&lt;c\). Which statement(s) must be true? I. \(k&gt;0\) II. \(f(k)&gt;0\) III. \(f(0)&gt;0\).`, options: ['I and II only', 'II and III only', 'I and III only', 'I, II, and III'], answer: 'A' },
            { prompt: raw`The function \(w(r)=\frac1{r-8}-\frac{r-5}{-r+4.25}\). What is the greatest possible \(r\) such that \(w(r)=0\)?`, answer: '6.5' },
            { prompt: raw`The function is \(f(x)=11x^3\). The graph \(y=f(-x)+c\), where \(c\) is a positive integer, has \(x\)-intercept \((r,0)\) and \(y\)-intercept \((0,t)\). Which must be true?`, options: ['\(r&lt;0\) and \(t&lt;0\)', '\(r&lt;0\) and \(t&gt;0\)', '\(r&gt;0\) and \(t&gt;0\)', '\(r&gt;0\) and \(t&lt;0\)'], answer: 'C' },
            { prompt: raw`For \(f(x)=b\sqrt{a-x}+7\sqrt{a-x}\), \(a,b\) are constants and \(f(16)=0\). If \(f(9)>0\), which could be \(a+b\)?`, options: ['−3', '7', '9', '15'], answer: 'D' },
            { prompt: raw`The figure shows a triangular prism whose equilateral-triangle base has side length \(x\) and whose length is \(x\sqrt3\). If the prism volume is \(\frac{2187}{4}\), what is \(x\)?` + figure('PREPX_3_images/q22-prism.png', 'Triangular prism with an equilateral-triangle base'), options: ['3', '9', '27', '81'], answer: 'B' },
            { prompt: raw`The function \(j(x)=\frac{8x+4}{7p}\), and \(k(x)=\frac{j(x)\cdot p}{x+1}\), where \(p>0\). What is \(k(5)\)?`, options: [raw`\(\frac{38}{7}\)`, raw`\(\frac{44}{13}\)`, raw`\(\frac87\)`, raw`\(\frac{22}{21}\)`], answer: 'D' },
            { prompt: raw`In the figure, the area of triangle \(ABC\) is \(2x^2\). What is \(\cos(\angle BCP)\)?` + figure('PREPX_3_images/q24-triangle.png', 'Triangle ABC with altitude BP perpendicular to AC'), options: [raw`\(\frac1{\sqrt{10}}\)`, raw`\(\frac3{\sqrt{10}}\)`, raw`\(\frac13\)`, '3'], answer: 'B' },
            { prompt: raw`Which expression is a factor of \(y^2(x-9)-36(x-9)^3\)?`, options: [raw`\(y(x-9)\)`, raw`\((x-9)(x-6)\)`, raw`\(y+x-9\)`, raw`\(y+6x-54\)`], answer: 'D' },
            { prompt: raw`The function \(p(x)=a((x+5)^2-b)((x+5)^2-c)\) passes through \((-6,30)\) and \((0,342)\). What is \(p(-10)+p(-4)\)?`, answer: '372' },
            { prompt: raw`The system is \(x^2+y^2=36\) and \(y=mx+\frac b4\). The constants \(m,b\) are negative. The graphs intersect at \((-5,y)\), where \(y&lt;0\). Which expression represents \(b\)?`, options: [raw`\(-\frac{5m}{4}+\frac{\sqrt{11}}4\)`, raw`\(\frac{5m}{4}-\frac{\sqrt{11}}4\)`, raw`\(-20m+4\sqrt{11}\)`, raw`\(20m-4\sqrt{11}\)`], answer: 'D' },
            { prompt: raw`For \(x\geq0\), \(f(x)=a(0.63)^{-bx}\) and \(g(x)=a(1.37)^{x+2}+b\). The constants \(a,b\) are integers with \(a&lt;b\) and \(a&gt;1\). Which equation displays, as a constant or coefficient, the minimum value of its function? I. \(f(x)\) II. \(g(x)\)`, options: ['I only', 'II only', 'I and II', 'Neither I nor II'], answer: 'A' },
            { prompt: raw`In the diagram, \(XZ\parallel RS\), and \(\tan R=\frac{216}{713}\). What is \(\sin X\) in triangle \(XYZ\)?` + figure('PREPX_3_images/q29-triangle.png', 'Nested right triangles RST and XYZ'), options: [raw`\(\frac{216}{929}\)`, raw`\(\frac{216}{745}\)`, raw`\(\frac{713}{745}\)`, raw`\(\frac{713}{216}\)`], answer: 'C' },
            { prompt: raw`The table shows pants by length and color. A pair is selected at random. What is the probability that it is brown, given that it is regular length? Express the answer as a decimal or fraction.` + table(['', 'Black', 'Brown', 'Blue', 'Total'], [['Short', '25', '14', '24', '63'], ['Regular', '23', '15', '22', '60'], ['Long', '20', '19', '19', '58'], ['Total', '68', '48', '65', '181']]), answer: '1/4' },
            { prompt: raw`The function is \(f(x)=-39^x\). The function \(g\) is a decreasing line. Their graphs intersect at \((h,j)\) and \((k,m)\), where \(j&gt;m\). When \(g(x)&lt;f(x)\), which must be true?`, options: [raw`\(x&gt;k\)`, raw`\(x&lt;h\)`, raw`\(x&gt;k\) or \(x&lt;h\)`, raw`\(h&lt;x&lt;k\)`], answer: 'D' },
            { prompt: raw`A circle has center \((-7,3)\) and radius 9. Its equation is \(x^2+y^2+ax+by+c=0\). What is \(c\)?`, answer: '-23' },
            { prompt: raw`A science club at a certain high school in Ohio conducted an experiment on the effects of smell on taste. A sample of 80 students was selected at random from the high school. Students tasted a pureed food sample while wearing covered goggles and nose plugs, then tasted the same sample without nose plugs. Thirty-two students correctly identified the food while wearing nose plugs. What is the largest population to which the results can be generalized?`, options: ['All students from high schools in Ohio.', 'The 80 students who participated.', 'All students from the high school.', 'The 32 students who correctly identified the sample while wearing nose plugs.'], answer: 'C' },
            { prompt: raw`A research manager selected two random samples of ovens to estimate average preheating time. The first estimate was 15.2 minutes with a 1-minute margin of error; the second was 15.4 minutes with a 2.2-minute margin of error. Assuming the margins were calculated the same way, what best explains the smaller margin for the first sample?`, options: ['The first sample contained more ovens than the second sample.', 'The first sample contained fewer ovens than the second sample.', 'The first sample took longer on average to preheat.', 'The first sample took less time on average to preheat.'], answer: 'A' },
            { prompt: raw`A small business owner budgets \$2,200 for candles and must buy at least 200 candles to maintain discounted pricing. Small candles cost \$4.90 and large candles cost \$11.60. What is the maximum number of large candles the owner can buy and still meet both requirements?`, answer: '182' }
        ]
    };

    const parseNumber = value => {
        const cleaned = value.trim().replace(/[−–—]/g, '-').replace(/,/g, '').replace(/\s+/g, '');
        if (!cleaned) return NaN;
        const fraction = cleaned.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
        if (fraction) {
            const denominator = Number(fraction[2]);
            return denominator === 0 ? NaN : Number(fraction[1]) / denominator;
        }
        return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(cleaned) ? Number(cleaned) : NaN;
    };

    const quizId = document.body.dataset.prepxQuiz;
    const questions = quizzes[quizId];
    const mount = document.getElementById('quiz');
    if (!questions || !mount) return;

    const quizTitle = `PREPX ${quizId} SAT Math`;
    const studentId = sessionStorage.getItem('studentId') || 'guest';
    const storageKey = `quiz_draft_${studentId}_${quizTitle}`;
    let startTime = new Date();
    let resultSent = false;
    const questionMarkup = questions.map((question, index) => {
        const id = `prepx-${quizId}-q${index + 1}`;
        const response = question.options
            ? `<ul class="options">${question.options.map((option, optionIndex) => {
                const letter = String.fromCharCode(65 + optionIndex);
                return `<li><label for="${id}-${letter}" id="label-${id}-${letter}"><input type="radio" name="${id}" id="${id}-${letter}" value="${letter}"><span class="answer-letter">${letter})</span><span class="answer-content">${option}</span></label></li>`;
            }).join('')}</ul>`
            : `<div class="answer-entry"><label class="sr-only" for="${id}-answer">Enter your answer to question ${index + 1}</label><input class="fill-input" id="${id}-answer" name="${id}" type="text" inputmode="decimal" autocomplete="off" aria-describedby="${id}-feedback" placeholder="Enter your answer"></div>`;
        return `<section class="question-block" data-question-id="${id}" data-answer-type="${question.options ? 'choice' : 'free-response'}"><div class="question-text">${question.prompt}</div>${response}<div class="answer-feedback" id="${id}-feedback" aria-live="polite"></div></section>`;
    }).join('');
    mount.innerHTML = questionMarkup;

    const progress = document.getElementById('progressText');
    const score = document.getElementById('scoreText');
    const feedbackFor = (index) => document.getElementById(`prepx-${quizId}-q${index + 1}-feedback`);

    function saveDraft() {
        const answers = {};
        questions.forEach((question, index) => {
            const id = `prepx-${quizId}-q${index + 1}`;
            const value = question.options
                ? (mount.querySelector(`input[name="${id}"]:checked`)?.value || '')
                : (document.getElementById(`${id}-answer`).value || '').trim();
            if (value) answers[id] = value;
        });
        try { localStorage.setItem(storageKey, JSON.stringify(answers)); } catch (error) {}
    }

    function restoreDraft() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
            if (!saved || typeof saved !== 'object') return;
            questions.forEach((question, index) => {
                const id = `prepx-${quizId}-q${index + 1}`;
                const value = saved[id] || (Array.isArray(saved) ? saved[index] : '');
                if (!value) return;
                if (question.options && value) {
                    const input = document.getElementById(`${id}-${value}`);
                    if (input) input.checked = true;
                } else if (!question.options) {
                    document.getElementById(`${id}-answer`).value = value || '';
                }
            });
        } catch (error) {}
    }

    function clearMarks() {
        mount.querySelectorAll('.correct-answer-label, .wrong-answer-label, .correct-input, .wrong-input')
            .forEach(element => element.classList.remove('correct-answer-label', 'wrong-answer-label', 'correct-input', 'wrong-input'));
        mount.querySelectorAll('.answer-feedback').forEach(element => { element.textContent = ''; });
    }

    function checkCurrentAnswers() {
        clearMarks();
        let answered = 0;
        let correctCount = 0;
        questions.forEach((question, index) => {
            const id = `prepx-${quizId}-q${index + 1}`;
            const feedback = feedbackFor(index);
            let isCorrect = false;
            let hasResponse = false;
            if (question.options) {
                const selected = mount.querySelector(`input[name="${id}"]:checked`);
                if (selected) {
                    hasResponse = true;
                    answered += 1;
                    isCorrect = selected.value === question.answer;
                    const correctLabel = document.getElementById(`label-${id}-${question.answer}`);
                    correctLabel?.classList.add('correct-answer-label');
                    if (!isCorrect) document.getElementById(`label-${id}-${selected.value}`)?.classList.add('wrong-answer-label');
                }
            } else {
                const input = document.getElementById(`${id}-answer`);
                const value = input.value.trim();
                if (value) {
                    hasResponse = true;
                    answered += 1;
                    const expected = Array.isArray(question.answer) ? question.answer : [question.answer];
                    const actualNumber = parseNumber(value);
                    isCorrect = expected.some(answer => {
                        const expectedNumber = parseNumber(answer);
                        return Number.isFinite(actualNumber) && Number.isFinite(expectedNumber)
                            && Math.abs(actualNumber - expectedNumber) <= 1e-8 * Math.max(1, Math.abs(expectedNumber));
                    });
                    input.classList.add(isCorrect ? 'correct-input' : 'wrong-input');
                }
            }
            if (isCorrect) correctCount += 1;
            if (!hasResponse) {
                feedback.textContent = 'Enter an answer to check this question.';
            } else if (isCorrect) {
                feedback.textContent = 'Correct.';
            } else {
                feedback.textContent = `Not quite. The correct answer is ${Array.isArray(question.answer) ? question.answer.join(' or ') : question.answer}.`;
            }
            feedback.classList.toggle('is-correct', isCorrect);
            feedback.classList.toggle('is-wrong', hasResponse && !isCorrect);
        });
        if (progress) progress.textContent = `${answered}/${questions.length}`;
        if (score) score.textContent = `${correctCount}/${questions.length}`;
        saveDraft();
        if (answered === questions.length && !resultSent) {
            const endTime = new Date();
            const answers = {};
            questions.forEach((question, index) => {
                const id = `prepx-${quizId}-q${index + 1}`;
                const value = question.options
                    ? (mount.querySelector(`input[name="${id}"]:checked`)?.value || '')
                    : (document.getElementById(`${id}-answer`).value || '').trim();
                answers[`Câu ${index + 1}`] = value || 'Bỏ trống';
            });
            const history = JSON.parse(localStorage.getItem('sat_results') || '[]');
            const result = {
                id: Date.now(),
                studentName: sessionStorage.getItem('studentName') || 'Học sinh ẩn danh',
                studentId,
                quizTitle: document.title || quizTitle,
                attempt: history.filter(item =>
                    item.studentId === studentId && item.quizTitle === document.title
                ).length + 1,
                score: `${correctCount}/${questions.length}`,
                total: questions.length,
                percentage: `${Math.round(correctCount / questions.length * 100)}%`,
                answers,
                startTime: startTime.toLocaleTimeString('vi-VN') + ' ' + startTime.toLocaleDateString('vi-VN'),
                endTime: endTime.toLocaleTimeString('vi-VN') + ' ' + endTime.toLocaleDateString('vi-VN'),
                duration: `${Math.max(0, Math.round((endTime - startTime) / 1000))} giây`
            };
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'SAT_SUBMIT_RESULT', data: result }, '*');
            } else {
                history.push(result);
                localStorage.setItem('sat_results', JSON.stringify(history));
            }
            resultSent = true;
        }
    }

    function resetQuiz() {
        startTime = new Date();
        resultSent = false;
        mount.querySelectorAll('input[type="radio"]').forEach(input => { input.checked = false; });
        mount.querySelectorAll('input[type="text"]').forEach(input => { input.value = ''; });
        clearMarks();
        if (progress) progress.textContent = `0/${questions.length}`;
        if (score) score.textContent = `0/${questions.length}`;
        try {
            localStorage.removeItem(storageKey);
            localStorage.removeItem(`${storageKey}_times`);
            localStorage.removeItem(`${storageKey}_total`);
        } catch (error) {}
        window.__saturnifyOnQuizReset?.();
    }

    restoreDraft();
    document.getElementById('checkBtn')?.addEventListener('click', checkCurrentAnswers);
    document.getElementById('resetBtn')?.addEventListener('click', resetQuiz);
    mount.addEventListener('input', saveDraft);
    mount.addEventListener('change', saveDraft);
    if (progress) progress.textContent = `0/${questions.length}`;
    if (score) score.textContent = `0/${questions.length}`;
    if (window.MathJax?.startup?.promise) {
        window.MathJax.startup.promise.then(() => window.MathJax.typesetPromise?.([mount]));
    } else {
        window.addEventListener('load', () => window.MathJax?.typesetPromise?.([mount]), { once: true });
    }
})();
