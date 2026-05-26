<script>
  import { onMount } from 'svelte';

  let activeTab = 'symbolic';
  let output = '';
  let latexOutput = '';
  let error = '';
  let slang;
  let loaded = false;

  // Polynomial inputs
  let polyCoeffs = '1,-3,2';
  let polyVar = 'x';
  let polyDiffVar = 'x';
  let evalX = '2';

  // Fraction inputs
  let fracNumi = '1,0,-1'; // x^2 - 1
  let fracDeno = '1,-1';   // x - 1
  let fracDiffVar = 'x';
  let fracEvalX = '3';

  // LaTeX inputs
  let latexInput = '\\frac{x^{2} - 1}{x^{2} + 1}';

  // Gradient inputs
  let gradTerms = 'x2y1'; // x^2 * y
  let gradPoint = '2,3';

  // Trig inputs
  let trigFunc = 'sin';
  let trigArg = 'x';
  let trigEval = '1.5708';

  // Symbolic playground inputs
  let symbolicExpr = 'sin(x^2) + x^3 / 3';
  let symbolicVar = 'x';
  let symbolicEval = '2';
  let symbolicMode = 'differentiate';

  // Linear algebra inputs
  let matrixInput = '4,1,2\n1,3,0\n2,0,5';
  let vectorInput = '7,8,3';

  // ODE inputs
  let odeRate = '0.8';
  let odeInitial = '1';
  let odeEnd = '3';
  let odeStep = '0.25';

  onMount(async () => {
    try {
      slang = await import('slangmath');
      loaded = true;
    } catch (e) {
      error = 'Failed to load slangmath: ' + e.message;
    }
  });

  function parseCoeffs(str) {
    const coeffs = str.split(',').map(v => Number(v.trim()));
    if (coeffs.some(v => !Number.isFinite(v))) {
      throw new Error('Coefficients must be comma-separated numbers.');
    }
    return coeffs;
  }

  function parseMatrix(str) {
    const rows = str.trim().split(/\n+/).map(row => row.split(',').map(v => Number(v.trim())));
    if (!rows.length || rows.some(row => row.some(v => !Number.isFinite(v)))) {
      throw new Error('Matrix rows must contain comma-separated numbers.');
    }
    const width = rows[0].length;
    if (rows.some(row => row.length !== width)) {
      throw new Error('Every matrix row must have the same number of values.');
    }
    return rows;
  }

  function parseVector(str) {
    const vector = str.split(',').map(v => Number(v.trim()));
    if (vector.some(v => !Number.isFinite(v))) {
      throw new Error('Vector must contain comma-separated numbers.');
    }
    return vector;
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    return String(Math.round(value * 1e8) / 1e8);
  }

  function run() {
    if (!loaded) return;
    error = '';
    output = '';
    latexOutput = '';
    try {
      const {
        createTerm, createFraction, polynomial,
        simplifyFraction, evaluateFraction, evaluatePolynomial, differentiateFraction,
        numericalIntegrateFraction, slangToLatex, latexToSlang,
        gradient, hessian, tangentPlane, findCriticalPoints,
        createFunction, evaluateFunction, extendedSlangToLatex,
        parseExpr, symDiff, symEval, symIntegrate, symSimplify, symToLatex,
        det, solve, trace, rk4
      } = slang;

      if (activeTab === 'polynomial') {
        const coeffs = parseCoeffs(polyCoeffs);
        const poly = polynomial(coeffs, polyVar);
        const frac = poly[0][0];
        const simplified = simplifyFraction(frac);
        const diff = differentiateFraction(frac, polyDiffVar);
        const evalResult = evaluateFraction(frac, { [polyVar]: parseFloat(evalX) });
        const latex = slangToLatex(frac);
        const diffLatex = slangToLatex(diff);

        output = `Polynomial: ${JSON.stringify(simplified.numi.terms, null, 2)}\n\nDerivative terms: ${JSON.stringify(diff.numi.terms, null, 2)}\n\nf(${polyVar}=${evalX}) = ${evalResult}`;
        latexOutput = `Expression: ${latex}\nDerivative: ${diffLatex}`;
      }

      if (activeTab === 'fraction') {
        const nTerms = parseCoeffs(fracNumi);
        const dTerms = parseCoeffs(fracDeno);
        const makeTerms = (coeffs, v) => {
          const deg = coeffs.length - 1;
          return coeffs.map((c, i) => {
            const p = deg - i;
            return p === 0 ? createTerm(c) : createTerm(c, { [v]: p });
          }).filter(t => t.coeff !== 0);
        };
        const numi = makeTerms(nTerms, 'x');
        const deno = makeTerms(dTerms, 'x');
        const frac = createFraction(numi, deno);
        const diff = differentiateFraction(frac, fracDiffVar);
        const evalResult = evaluateFraction(frac, { x: parseFloat(fracEvalX) });
        const latex = slangToLatex(frac);
        const diffLatex = slangToLatex(diff);

        output = `Rational Function created.\n\nf(x=${fracEvalX}) = ${evalResult}\n\nNumerator terms: ${JSON.stringify(numi)}\nDenominator terms: ${JSON.stringify(deno)}`;
        latexOutput = `Expression: ${latex}\nDerivative: ${diffLatex}`;
      }

      if (activeTab === 'latex') {
        const parsed = latexToSlang(latexInput);
        const backToLatex = slangToLatex(parsed);
        output = `Parsed SLaNg object:\n${JSON.stringify(parsed, null, 2)}`;
        latexOutput = `Re-rendered LaTeX: ${backToLatex}`;
      }

      if (activeTab === 'calculus') {
        // f(x,y) = x^2 + y^2
        const surface = { terms: [createTerm(1, { x: 2 }), createTerm(1, { y: 2 })] };
        const [x0, y0] = gradPoint.split(',').map(Number);
        const grad = gradient(surface, ['x', 'y']);
        const hess = hessian(surface, ['x', 'y']);
        const critical = findCriticalPoints(surface, ['x', 'y']);
        const point = { x: x0, y: y0 };
        const z0 = evaluatePolynomial(surface, point);
        const fx0 = evaluatePolynomial(grad.x, point);
        const fy0 = evaluatePolynomial(grad.y, point);
        const tangent = {
          point: { ...point, z: z0 },
          normal: { x: -fx0, y: -fy0, z: 1 }
        };

        output = `Surface: f(x,y) = x² + y²\n\nGradient:\n  ∂f/∂x = ${JSON.stringify(grad.x?.terms)}\n  ∂f/∂y = ${JSON.stringify(grad.y?.terms)}\n\nHessian Matrix:\n${JSON.stringify(hess, null, 2)}\n\nTangent Plane at (${x0}, ${y0}):\n  Point: ${JSON.stringify(tangent.point)}\n  Normal: ${JSON.stringify(tangent.normal)}\n\nCritical Points: ${JSON.stringify(critical)}`;
        latexOutput = `Gradient at (${x0},${y0}): ∇f = (${2*x0}, ${2*y0})`;
      }

      if (activeTab === 'trig') {
        const { createFunction: cf, evaluateFunction: ef, extendedSlangToLatex: etl } = slang;
        const expr = cf(trigFunc, [createTerm(1, { [trigArg]: 1 })]);
        const val = ef(expr, { [trigArg]: parseFloat(trigEval) });
        const latex = etl(expr);
        output = `Function: ${trigFunc}(${trigArg})\nAt ${trigArg}=${trigEval}: ${val?.toFixed(6) ?? val}`;
        latexOutput = `LaTeX: ${latex}`;
      }

      if (activeTab === 'symbolic') {
        const ast = parseExpr(symbolicExpr);
        const simplified = symSimplify(ast);
        const x = Number(symbolicEval);
        let result = simplified;
        let valueLabel = 'Input';

        if (symbolicMode === 'differentiate') {
          result = symSimplify(symDiff(ast, symbolicVar));
          valueLabel = `d/d${symbolicVar}`;
        }

        if (symbolicMode === 'integrate') {
          result = symSimplify(symIntegrate(ast, symbolicVar));
          valueLabel = `Integral d${symbolicVar}`;
        }

        const numeric = Number.isFinite(x) ? symEval(result, { [symbolicVar]: x }) : NaN;
        output = `${valueLabel} result tree:\n${JSON.stringify(result, null, 2)}\n\nAt ${symbolicVar}=${symbolicEval}: ${formatNumber(numeric)}`;
        latexOutput = `Input: ${symToLatex(simplified)}\nResult: ${symToLatex(result)}`;
      }

      if (activeTab === 'matrix') {
        const A = parseMatrix(matrixInput);
        const b = parseVector(vectorInput);
        if (A.length !== A[0].length) throw new Error('Matrix must be square for determinant and solve.');
        if (b.length !== A.length) throw new Error('Vector length must match matrix row count.');
        const solution = solve(A, b).map(formatNumber);
        output = `A = ${JSON.stringify(A)}\nb = ${JSON.stringify(b)}\n\ntrace(A) = ${formatNumber(trace(A))}\ndet(A) = ${formatNumber(det(A))}\nsolution x = [${solution.join(', ')}]`;
        latexOutput = `Solves Ax=b for a ${A.length}×${A.length} system using LU decomposition.`;
      }

      if (activeTab === 'ode') {
        const r = Number(odeRate);
        const y0 = Number(odeInitial);
        const tEnd = Number(odeEnd);
        const h = Number(odeStep);
        if (![r, y0, tEnd, h].every(Number.isFinite)) throw new Error('ODE inputs must be numbers.');
        const result = rk4((t, y) => r * y, 0, y0, tEnd, h);
        const samples = result.t.map((t, i) => ({ t: formatNumber(t), y: formatNumber(result.y[i]) }));
        const last = samples[samples.length - 1];
        output = `Equation: y' = ${r}y\nMethod: ${result.method.toUpperCase()}\nSteps: ${samples.length - 1}\nFinal: y(${last.t}) = ${last.y}\n\nSamples:\n${samples.slice(0, 12).map(p => `t=${p.t}, y=${p.y}`).join('\n')}`;
        latexOutput = `Analytic reference: y(t)=y_0 e^{rt}`;
      }

    } catch (e) {
      error = e.message;
    }
  }

  $: if (loaded && activeTab) run();

  const tabs = [
    { id: 'symbolic', label: 'Symbolic', icon: '∂' },
    { id: 'polynomial', label: 'Polynomial', icon: '∑' },
    { id: 'fraction', label: 'Rational', icon: '⅟' },
    { id: 'latex', label: 'LaTeX ↔', icon: '∫' },
    { id: 'calculus', label: 'Multivariable', icon: '∇' },
    { id: 'trig', label: 'Trig Funcs', icon: 'sin' },
    { id: 'matrix', label: 'Matrix', icon: '▦' },
    { id: 'ode', label: 'ODE', icon: 'ẏ' },
  ];

  const examples = [
    { label: 'Chain rule', tab: 'symbolic', apply: () => { symbolicExpr = 'sin(x^2) + cos(x)'; symbolicMode = 'differentiate'; symbolicEval = '1.57'; } },
    { label: 'Quotient', tab: 'fraction', apply: () => { fracNumi = '1,0,1'; fracDeno = '1,-1'; fracEvalX = '3'; } },
    { label: 'Paraboloid', tab: 'calculus', apply: () => { gradPoint = '2,3'; } },
    { label: 'LU solve', tab: 'matrix', apply: () => { matrixInput = '4,1,2\n1,3,0\n2,0,5'; vectorInput = '7,8,3'; } },
    { label: 'Growth ODE', tab: 'ode', apply: () => { odeRate = '0.8'; odeInitial = '1'; odeEnd = '3'; odeStep = '0.25'; } }
  ];

  function setTab(t) { activeTab = t; output = ''; latexOutput = ''; error = ''; }
  function loadExample(example) { example.apply(); setTab(example.tab); }
</script>

<svelte:head>
  <title>SLaNg Math — Live Demo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<main>
  <div class="bg-grid"></div>

  <header>
    <div class="logo-area">
      <span class="logo-symbol">∫</span>
      <div>
        <h1>SLaN<span class="accent">g</span></h1>
        <p class="tagline">Saad's Language for Analytical Numerics &amp; Geometry</p>
      </div>
    </div>
    <div class="header-meta">
      <span class="badge">v1.1.0</span>
      <span class="badge">Zero Dependencies</span>
      <span class="badge">Pure JS</span>
    </div>
  </header>

  <section class="hero">
    <div class="hero-text">
      <p>A powerful JS library for symbolic &amp; numerical mathematics. Compute derivatives, integrals, gradients, Taylor series, LaTeX conversion, and more — all without a single dependency.</p>
      <div class="quick-examples">
        {#each examples as example}
          <button on:click={() => loadExample(example)}>{example.label}</button>
        {/each}
      </div>
    </div>
    <div class="hero-panel">
      <div class="install-box">
        <span class="install-label">Install</span>
        <code>npm i slangmath</code>
      </div>
      <div class="mini-stats">
        <span><strong>8</strong> live tools</span>
        <span><strong>35</strong> browser modules</span>
        <span><strong>0</strong> runtime deps</span>
      </div>
    </div>
  </section>

  <section class="demo-area">
    <div class="tabs">
      {#each tabs as t}
        <button class="tab {activeTab === t.id ? 'active' : ''}" on:click={() => setTab(t.id)}>
          <span class="tab-icon">{t.icon}</span>
          {t.label}
        </button>
      {/each}
    </div>

    <div class="panel">
      {#if !loaded}
        <div class="loading">
          <span class="spin">⚙</span> Loading slangmath...
        </div>
      {:else}

      <!-- SYMBOLIC TAB -->
      {#if activeTab === 'symbolic'}
        <div class="inputs">
          <div class="field wide">
            <span class="field-label">Expression</span>
            <input bind:value={symbolicExpr} on:input={run} placeholder="sin(x^2) + x^3 / 3" />
            <span class="hint">Supports +, -, *, /, ^, parentheses, trig, exp, ln, sqrt, abs</span>
          </div>
          <div class="field">
            <span class="field-label">Operation</span>
            <select bind:value={symbolicMode} on:change={run}>
              <option value="differentiate">Differentiate</option>
              <option value="integrate">Integrate</option>
              <option value="simplify">Simplify</option>
            </select>
          </div>
          <div class="field">
            <span class="field-label">Variable</span>
            <input bind:value={symbolicVar} on:input={run} maxlength="1" />
          </div>
          <div class="field">
            <span class="field-label">Evaluate at {symbolicVar} =</span>
            <input type="number" step="0.01" bind:value={symbolicEval} on:input={run} />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} parseExpr, symDiff, symIntegrate, symSimplify, symToLatex {'}'} from 'slangmath';
const ast = parseExpr('{symbolicExpr}');
const result = symSimplify({symbolicMode === 'integrate' ? `symIntegrate(ast, '${symbolicVar}')` : symbolicMode === 'differentiate' ? `symDiff(ast, '${symbolicVar}')` : 'ast'});
symToLatex(result);</code></pre>
        </div>
      {/if}

      <!-- POLYNOMIAL TAB -->
      {#if activeTab === 'polynomial'}
        <div class="inputs">
          <div class="field">
            <span class="field-label">Coefficients (highest→lowest degree)</span>
            <input bind:value={polyCoeffs} on:input={run} placeholder="e.g. 1,-3,2" />
            <span class="hint">Creates x²−3x+2</span>
          </div>
          <div class="field">
            <span class="field-label">Variable</span>
            <input bind:value={polyVar} on:input={run} maxlength="1" />
          </div>
          <div class="field">
            <span class="field-label">Evaluate at {polyVar} =</span>
            <input type="number" bind:value={evalX} on:input={run} />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} polynomial, differentiateFraction, slangToLatex {'}'} from 'slangmath';
const poly = polynomial([{polyCoeffs}], '{polyVar}');
const diff = differentiateFraction(poly[0][0], '{polyVar}');
slangToLatex(diff);</code></pre>
        </div>
      {/if}

      <!-- FRACTION TAB -->
      {#if activeTab === 'fraction'}
        <div class="inputs">
          <div class="field">
            <span class="field-label">Numerator coefficients</span>
            <input bind:value={fracNumi} on:input={run} placeholder="1,0,-1" />
            <span class="hint">e.g. 1,0,-1 → x²−1</span>
          </div>
          <div class="field">
            <span class="field-label">Denominator coefficients</span>
            <input bind:value={fracDeno} on:input={run} placeholder="1,-1" />
            <span class="hint">e.g. 1,-1 → x−1</span>
          </div>
          <div class="field">
            <span class="field-label">Evaluate at x =</span>
            <input type="number" bind:value={fracEvalX} on:input={run} />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} createTerm, createFraction, slangToLatex {'}'} from 'slangmath';
const frac = createFraction(numeratorTerms, denominatorTerms);
slangToLatex(frac); // → LaTeX string</code></pre>
        </div>
      {/if}

      <!-- LATEX TAB -->
      {#if activeTab === 'latex'}
        <div class="inputs">
          <div class="field wide">
            <span class="field-label">LaTeX Expression</span>
            <input bind:value={latexInput} on:input={run} placeholder="\\frac&#123;x^2-1&#125;&#123;x+1&#125;" />
            <span class="hint">Enter any LaTeX math expression</span>
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} latexToSlang, slangToLatex {'}'} from 'slangmath';
const slangObj = latexToSlang('{latexInput}');
slangToLatex(slangObj); // roundtrip</code></pre>
        </div>
      {/if}

      <!-- CALCULUS TAB -->
      {#if activeTab === 'calculus'}
        <div class="inputs">
          <div class="field">
            <span class="field-label">Surface: f(x,y) = x² + y²</span>
            <span class="hint">Fixed paraboloid for demonstration</span>
          </div>
          <div class="field">
            <span class="field-label">Point (x₀, y₀)</span>
            <input bind:value={gradPoint} on:input={run} placeholder="1,2" />
            <span class="hint">Tangent plane is computed here</span>
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} gradient, hessian, tangentPlane, findCriticalPoints {'}'} from 'slangmath';
const surface = {'{'} terms: [createTerm(1,{'{'} x:2 {'}'}), createTerm(1,{'{'} y:2 {'}'})] {'}'};
gradient(surface, ['x','y']);
tangentPlane(surface, {gradPoint.split(',')[0]}, {gradPoint.split(',')[1]});</code></pre>
        </div>
      {/if}

      <!-- TRIG TAB -->
      {#if activeTab === 'trig'}
        <div class="inputs">
          <div class="field">
            <span class="field-label">Function</span>
            <select bind:value={trigFunc} on:change={run}>
              {#each ['sin','cos','tan','arcsin','arccos','arctan','sinh','cosh','tanh','ln','exp','sqrt','abs'] as f}
                <option value={f}>{f}</option>
              {/each}
            </select>
          </div>
          <div class="field">
            <span class="field-label">Variable</span>
            <input bind:value={trigArg} on:input={run} maxlength="1" />
          </div>
          <div class="field">
            <span class="field-label">Evaluate at {trigArg} =</span>
            <input type="number" step="0.01" bind:value={trigEval} on:input={run} />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} createFunction, evaluateFunction, extendedSlangToLatex {'}'} from 'slangmath';
const expr = createFunction('{trigFunc}', [createTerm(1, {'{'} {trigArg}: 1 {'}'})]);
evaluateFunction(expr, {'{'} {trigArg}: {trigEval} {'}'});
extendedSlangToLatex(expr); // LaTeX output</code></pre>
        </div>
      {/if}

      <!-- MATRIX TAB -->
      {#if activeTab === 'matrix'}
        <div class="inputs">
          <div class="field wide">
            <span class="field-label">Matrix A</span>
            <textarea bind:value={matrixInput} on:input={run} rows="4" placeholder="4,1,2&#10;1,3,0&#10;2,0,5"></textarea>
            <span class="hint">One row per line, comma-separated values</span>
          </div>
          <div class="field wide">
            <span class="field-label">Vector b</span>
            <input bind:value={vectorInput} on:input={run} placeholder="7,8,3" />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} det, trace, solve {'}'} from 'slangmath';
const A = matrixRows;
const b = [{vectorInput}];
solve(A, b);</code></pre>
        </div>
      {/if}

      <!-- ODE TAB -->
      {#if activeTab === 'ode'}
        <div class="inputs">
          <div class="field">
            <span class="field-label">Rate r</span>
            <input type="number" step="0.1" bind:value={odeRate} on:input={run} />
          </div>
          <div class="field">
            <span class="field-label">Initial y(0)</span>
            <input type="number" step="0.1" bind:value={odeInitial} on:input={run} />
          </div>
          <div class="field">
            <span class="field-label">End time</span>
            <input type="number" step="0.1" bind:value={odeEnd} on:input={run} />
          </div>
          <div class="field">
            <span class="field-label">Step size</span>
            <input type="number" step="0.05" bind:value={odeStep} on:input={run} />
          </div>
        </div>
        <div class="code-hint">
          <pre><code>import {'{'} rk4 {'}'} from 'slangmath';
const result = rk4((t, y) => {odeRate} * y, 0, {odeInitial}, {odeEnd}, {odeStep});
result.y.at(-1);</code></pre>
        </div>
      {/if}

      <!-- OUTPUT -->
      <div class="output-area">
        {#if error}
          <div class="error-box">⚠ {error}</div>
        {:else}
          <div class="outputs">
            {#if output}
              <div class="out-block">
                <div class="out-label">Output</div>
                <pre>{output}</pre>
              </div>
            {/if}
            {#if latexOutput}
              <div class="out-block latex-block">
                <div class="out-label">LaTeX</div>
                <pre>{latexOutput}</pre>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {/if}
    </div>
  </section>

  <section class="features">
    <h2>What SLaNg Can Do</h2>
    <div class="feature-grid">
      {#each [
        { icon: '∂', title: 'Symbolic Differentiation', desc: 'Exact symbolic derivatives including quotient rule for rational functions.' },
        { icon: '∫', title: 'Integration', desc: 'Numerical integration via Simpson\'s rule plus symbolic where possible.' },
        { icon: '∇', title: 'Multivariable Calculus', desc: 'Gradient, Hessian, tangent planes, directional derivatives, critical points.' },
        { icon: 'λ', title: 'Lagrange Multipliers', desc: 'Constrained optimization with multiple constraint support.' },
        { icon: 'TeX', title: 'LaTeX Bidirectional', desc: 'Convert SLaNg expressions to LaTeX and parse LaTeX back into SLaNg.' },
        { icon: 'sin', title: 'Extended Functions', desc: 'Trig, inverse trig, hyperbolic, logarithmic, and exponential functions.' },
        { icon: '0', title: 'Zero Dependencies', desc: 'Pure JavaScript. No external libraries. Works anywhere JS runs.' },
        { icon: 'ℝ', title: 'Polynomial Arithmetic', desc: 'Full polynomial operations: sum, product, GCD simplification.' },
      ] as f}
        <div class="feature-card">
          <span class="f-icon">{f.icon}</span>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <footer>
    <p>SLaNg Math by <strong>Muhammad Saad Amin</strong> · MIT License</p>
    <p><code>npm i slangmath</code></p>
  </footer>
</main>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) {
    background: #080c14;
    color: #e8eaf0;
    font-family: 'Syne', sans-serif;
    min-height: 100vh;
  }

  main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px 80px;
    position: relative;
  }

  .bg-grid {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(56, 189, 248, 0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(248, 181, 72, 0.018) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
    z-index: 0;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 40px 0 24px;
    border-bottom: 1px solid rgba(56,189,248,0.15);
    position: relative;
    z-index: 1;
    flex-wrap: wrap;
    gap: 16px;
  }

  .logo-area {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .logo-symbol {
    font-size: 48px;
    color: #38bdf8;
    font-family: 'IBM Plex Mono', monospace;
    line-height: 1;
  }

  h1 {
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -1px;
    color: #f0f4ff;
  }

  .accent { color: #38bdf8; }

  .tagline {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #64748b;
    margin-top: 2px;
  }

  .header-meta {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .badge {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    padding: 3px 10px;
    border: 1px solid rgba(56,189,248,0.3);
    border-radius: 20px;
    color: #c7d2fe;
    background: rgba(129,140,248,0.08);
  }

  .hero {
    padding: 34px 0 30px;
    display: flex;
    align-items: stretch;
    gap: 40px;
    flex-wrap: wrap;
    position: relative;
    z-index: 1;
  }

  .hero-text {
    flex: 1;
    min-width: 260px;
  }

  .hero-text p {
    font-size: 15px;
    color: #94a3b8;
    line-height: 1.7;
    max-width: 520px;
  }

  .quick-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
  }

  .quick-examples button {
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: #cbd5e1;
    border-radius: 7px;
    padding: 8px 11px;
    font: 600 12px 'IBM Plex Mono', monospace;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s, background 0.2s;
  }

  .quick-examples button:hover {
    border-color: rgba(248,181,72,0.45);
    color: #fde68a;
    background: rgba(248,181,72,0.07);
  }

  .hero-panel {
    display: grid;
    gap: 10px;
    min-width: 285px;
  }

  .install-box {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(56,189,248,0.07);
    border: 1px solid rgba(56,189,248,0.25);
    border-radius: 8px;
    padding: 14px 20px;
    font-family: 'IBM Plex Mono', monospace;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mini-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .mini-stats span {
    min-width: 0;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.035);
    border-radius: 8px;
    padding: 10px;
    color: #94a3b8;
    font: 10px/1.4 'IBM Plex Mono', monospace;
  }

  .mini-stats strong {
    display: block;
    color: #f8b548;
    font-size: 17px;
    line-height: 1.1;
  }

  .install-label {
    font-size: 11px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .install-box code {
    color: #7dd3fc;
    font-size: 15px;
  }

  .demo-area {
    position: relative;
    z-index: 1;
  }

  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    margin-bottom: 0;
    flex-wrap: wrap;
  }

  .tab {
    background: none;
    border: none;
    color: #64748b;
    font-family: 'Syne', sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 12px 14px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tab:hover { color: #94a3b8; }

  .tab.active {
    color: #38bdf8;
    border-bottom-color: #38bdf8;
    background: rgba(56,189,248,0.055);
  }

  .tab-icon {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    opacity: 0.8;
  }

  .panel {
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255,255,255,0.07);
    border-top: none;
    border-radius: 0 0 8px 8px;
    padding: 28px;
    backdrop-filter: blur(8px);
  }

  .loading {
    text-align: center;
    color: #64748b;
    padding: 40px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
  }

  .spin { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .inputs {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 160px;
  }

  .field.wide { flex: 100%; }

  .field-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #64748b;
    font-family: 'IBM Plex Mono', monospace;
  }

  input, select, textarea {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 7px;
    color: #e2e8f0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    padding: 10px 13px;
    outline: none;
    transition: border 0.2s;
    width: 100%;
  }

  textarea {
    min-height: 110px;
    line-height: 1.55;
    resize: vertical;
  }

  input:focus, select:focus, textarea:focus {
    border-color: rgba(56,189,248,0.5);
    background: rgba(56,189,248,0.04);
  }

  .hint {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    color: #475569;
  }

  .code-hint {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.06);
    border-left: 3px solid #38bdf8;
    border-radius: 7px;
    padding: 14px 16px;
    margin-bottom: 20px;
    overflow-x: auto;
  }

  .code-hint pre { margin: 0; }

  .code-hint code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #7dd3fc;
    line-height: 1.7;
    white-space: pre;
  }

  .output-area { margin-top: 4px; }

  .error-box {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.3);
    color: #fca5a5;
    padding: 14px 16px;
    border-radius: 8px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }

  .outputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  @media (max-width: 640px) {
    .outputs { grid-template-columns: 1fr; }
  }

  .out-block {
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 14px 16px;
    overflow: auto;
  }

  .latex-block { border-color: rgba(52,211,153,0.22); }

  .out-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #475569;
    font-family: 'IBM Plex Mono', monospace;
    margin-bottom: 10px;
  }

  .out-block pre {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #c4f1e4;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
    margin: 0;
  }

  .features {
    margin-top: 72px;
    position: relative;
    z-index: 1;
  }

  .features h2 {
    font-size: 28px;
    font-weight: 800;
    color: #f0f4ff;
    margin-bottom: 32px;
    letter-spacing: -0.5px;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
  }

  .feature-card {
    background: rgba(15,23,42,0.6);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 8px;
    padding: 22px;
    transition: border-color 0.2s, transform 0.2s;
  }

  .feature-card:hover {
    border-color: rgba(56,189,248,0.3);
    transform: translateY(-2px);
  }

  .feature-card:nth-child(3n) .f-icon { color: #f8b548; }
  .feature-card:nth-child(3n + 1) .f-icon { color: #38bdf8; }
  .feature-card:nth-child(3n + 2) .f-icon { color: #34d399; }

  .f-icon {
    display: block;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 22px;
    color: #38bdf8;
    margin-bottom: 12px;
  }

  .feature-card h3 {
    font-size: 14px;
    font-weight: 700;
    color: #e2e8f0;
    margin-bottom: 8px;
  }

  .feature-card p {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
  }

  footer {
    margin-top: 80px;
    padding-top: 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    text-align: center;
    color: #475569;
    font-size: 13px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 1;
  }

  footer strong { color: #94a3b8; }
  footer code {
    font-family: 'IBM Plex Mono', monospace;
    color: #38bdf8;
    font-size: 12px;
  }
</style>
