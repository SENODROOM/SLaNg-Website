<script>
  import { onMount } from 'svelte';

  let slang;
  let loaded = false;
  let error = '';

  let expression = 'sin(x) + x^2 / 3';
  let variable = 'x';
  let evaluateAt = '2';
  let operation = 'differentiate';

  let resultLatex = '';
  let resultValue = '';
  let resultTree = '';
  let inputLatex = '';
  let codeSample = '';

  const operations = [
    { id: 'differentiate', label: 'Differentiate' },
    { id: 'integrate', label: 'Integrate' },
    { id: 'simplify', label: 'Simplify' },
    { id: 'evaluate', label: 'Evaluate' }
  ];

  const examples = [
    { label: 'Power rule', expr: 'x^4 - 3*x^2 + 7', op: 'differentiate', at: '2' },
    { label: 'Trig chain', expr: 'sin(x^2) + cos(x)', op: 'differentiate', at: '1.57' },
    { label: 'Quotient', expr: '(x^2 + 1)/(x - 1)', op: 'differentiate', at: '3' },
    { label: 'Integral', expr: 'x^3 + 2*x', op: 'integrate', at: '2' },
    { label: 'Numeric eval', expr: 'sqrt(x^2 + 9)', op: 'evaluate', at: '4' }
  ];

  onMount(async () => {
    try {
      slang = await import('slangmath');
      loaded = true;
      run();
    } catch (e) {
      error = `Could not load slangmath: ${e.message}`;
    }
  });

  function cleanVariable(value) {
    const match = value.trim().match(/[a-zA-Z_][a-zA-Z0-9_]*/);
    return match ? match[0] : 'x';
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) return String(value);
    const rounded = Math.round(value * 1e8) / 1e8;
    return String(rounded);
  }

  function run() {
    if (!loaded) return;

    error = '';
    resultLatex = '';
    resultValue = '';
    resultTree = '';
    inputLatex = '';

    try {
      const {
        parseExpr,
        symDiff,
        symIntegrate,
        symSimplify,
        symEval,
        symToLatex
      } = slang;

      const activeVariable = cleanVariable(variable);
      const ast = parseExpr(expression);
      const simplifiedInput = symSimplify(ast);
      inputLatex = symToLatex(simplifiedInput);

      let resultAst = simplifiedInput;

      if (operation === 'differentiate') {
        resultAst = symSimplify(symDiff(ast, activeVariable));
      }

      if (operation === 'integrate') {
        resultAst = symSimplify(symIntegrate(ast, activeVariable));
      }

      if (operation === 'simplify') {
        resultAst = simplifiedInput;
      }

      if (operation === 'evaluate') {
        const numericValue = Number(evaluateAt);
        const value = symEval(simplifiedInput, { [activeVariable]: numericValue });
        resultValue = `f(${activeVariable} = ${evaluateAt}) = ${formatNumber(value)}`;
      } else {
        resultLatex = symToLatex(resultAst);
        const numericValue = Number(evaluateAt);
        if (Number.isFinite(numericValue)) {
          try {
            const value = symEval(resultAst, { [activeVariable]: numericValue });
            resultValue = `At ${activeVariable} = ${evaluateAt}: ${formatNumber(value)}`;
          } catch {
            resultValue = '';
          }
        }
      }

      resultTree = JSON.stringify(resultAst, null, 2);
      codeSample = buildCodeSample(activeVariable);
    } catch (e) {
      error = e.message;
      codeSample = buildCodeSample(cleanVariable(variable));
    }
  }

  function buildCodeSample(activeVariable) {
    const fn =
      operation === 'differentiate' ? `symSimplify(symDiff(ast, '${activeVariable}'))` :
      operation === 'integrate' ? `symSimplify(symIntegrate(ast, '${activeVariable}'))` :
      operation === 'evaluate' ? `symEval(ast, { ${activeVariable}: ${Number(evaluateAt) || 0} })` :
      'symSimplify(ast)';

    return `import { parseExpr, symDiff, symIntegrate, symSimplify, symEval, symToLatex } from 'slangmath';

const ast = parseExpr('${expression.replace(/'/g, "\\'")}');
const result = ${fn};
${operation === 'evaluate' ? 'console.log(result);' : 'console.log(symToLatex(result));'}`;
  }

  function loadExample(example) {
    expression = example.expr;
    operation = example.op;
    evaluateAt = example.at;
    run();
  }

  $: if (loaded) run();
</script>

<svelte:head>
  <title>SLaNgMath Live Demo</title>
  <meta
    name="description"
    content="Interactive SLaNgMath playground for symbolic calculus, simplification, evaluation, and LaTeX output."
  />
</svelte:head>

<main>
  <header class="topbar">
    <div>
      <p class="eyebrow">SLaNgMath</p>
      <h1>Live symbolic math playground</h1>
    </div>
    <div class="status" class:ready={loaded}>
      {loaded ? 'Library loaded' : 'Loading library'}
    </div>
  </header>

  <section class="workspace" aria-label="SLaNgMath live demo">
    <div class="editor">
      <div class="field expression-field">
        <label for="expression">Expression</label>
        <textarea
          id="expression"
          bind:value={expression}
          on:input={run}
          spellcheck="false"
          placeholder="sin(x) + x^2 / 3"
        />
      </div>

      <div class="controls">
        <div class="field">
          <label for="operation">Operation</label>
          <select id="operation" bind:value={operation} on:change={run}>
            {#each operations as item}
              <option value={item.id}>{item.label}</option>
            {/each}
          </select>
        </div>

        <div class="field small">
          <label for="variable">Variable</label>
          <input id="variable" bind:value={variable} on:input={run} />
        </div>

        <div class="field small">
          <label for="evaluateAt">Evaluate at</label>
          <input id="evaluateAt" type="number" step="0.01" bind:value={evaluateAt} on:input={run} />
        </div>
      </div>

      <div class="examples" aria-label="Examples">
        {#each examples as example}
          <button type="button" on:click={() => loadExample(example)}>{example.label}</button>
        {/each}
      </div>
    </div>

    <div class="results" aria-live="polite">
      {#if error}
        <div class="message error">{error}</div>
      {:else if !loaded}
        <div class="message">Loading the local slangmath package...</div>
      {:else}
        <div class="result-grid">
          <article>
            <span>Input LaTeX</span>
            <pre>{inputLatex}</pre>
          </article>

          <article>
            <span>{operation === 'evaluate' ? 'Numeric result' : 'Result LaTeX'}</span>
            <pre>{operation === 'evaluate' ? resultValue : resultLatex}</pre>
          </article>

          {#if resultValue && operation !== 'evaluate'}
            <article>
              <span>Numeric check</span>
              <pre>{resultValue}</pre>
            </article>
          {/if}

          <article class="wide">
            <span>Generated code</span>
            <pre>{codeSample}</pre>
          </article>

          <article class="wide">
            <span>SLaNg AST</span>
            <pre>{resultTree}</pre>
          </article>
        </div>
      {/if}
    </div>
  </section>

  <section class="library-strip">
    <div>
      <strong>What this demo is running</strong>
      <p>Parsing, symbolic differentiation, symbolic integration, simplification, numeric evaluation, and LaTeX rendering all come from the actual local <code>slangmath</code> library.</p>
    </div>
    <code>npm i slangmath</code>
  </section>
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    color: #eef2f8;
    background:
      linear-gradient(135deg, rgba(6, 95, 70, 0.22), transparent 36%),
      linear-gradient(225deg, rgba(14, 116, 144, 0.18), transparent 40%),
      #0b1020;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  main {
    width: min(1180px, calc(100vw - 32px));
    margin: 0 auto;
    padding: 28px 0 56px;
  }

  .topbar {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    padding: 12px 0 26px;
  }

  .eyebrow {
    margin: 0 0 8px;
    color: #67e8f9;
    font: 700 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  h1 {
    margin: 0;
    max-width: 760px;
    font-size: clamp(34px, 7vw, 76px);
    line-height: 0.95;
    letter-spacing: 0;
  }

  .status {
    flex: 0 0 auto;
    border: 1px solid rgba(248, 113, 113, 0.4);
    color: #fecaca;
    background: rgba(127, 29, 29, 0.3);
    border-radius: 999px;
    padding: 8px 12px;
    font: 700 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .status.ready {
    border-color: rgba(45, 212, 191, 0.38);
    color: #99f6e4;
    background: rgba(15, 118, 110, 0.22);
  }

  .workspace {
    display: grid;
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
    gap: 16px;
    align-items: stretch;
  }

  .editor,
  .results,
  .library-strip {
    border: 1px solid rgba(226, 232, 240, 0.12);
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(14px);
    border-radius: 8px;
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  }

  .editor {
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .controls {
    display: grid;
    grid-template-columns: 1fr 110px 130px;
    gap: 12px;
  }

  label,
  article span {
    color: #94a3b8;
    font: 700 11px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  textarea,
  input,
  select {
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 7px;
    background: rgba(2, 6, 23, 0.54);
    color: #f8fafc;
    font: 500 15px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    outline: none;
  }

  textarea {
    min-height: 190px;
    resize: vertical;
    padding: 14px;
  }

  input,
  select {
    min-height: 44px;
    padding: 0 12px;
  }

  textarea:focus,
  input:focus,
  select:focus {
    border-color: rgba(103, 232, 249, 0.75);
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15);
  }

  .examples {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  button {
    border: 1px solid rgba(103, 232, 249, 0.24);
    border-radius: 999px;
    padding: 8px 11px;
    background: rgba(8, 145, 178, 0.13);
    color: #cffafe;
    font: 700 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    cursor: pointer;
  }

  button:hover {
    border-color: rgba(103, 232, 249, 0.6);
    background: rgba(8, 145, 178, 0.22);
  }

  .results {
    min-height: 560px;
    padding: 18px;
    overflow: hidden;
  }

  .result-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  article {
    min-width: 0;
    border: 1px solid rgba(148, 163, 184, 0.16);
    border-radius: 7px;
    background: rgba(2, 6, 23, 0.46);
    padding: 13px;
  }

  article.wide {
    grid-column: 1 / -1;
  }

  pre {
    margin: 10px 0 0;
    white-space: pre-wrap;
    word-break: break-word;
    color: #a7f3d0;
    font: 500 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .message {
    display: grid;
    min-height: 180px;
    place-items: center;
    color: #cbd5e1;
    text-align: center;
    font: 700 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .message.error {
    color: #fecaca;
    border: 1px solid rgba(248, 113, 113, 0.35);
    border-radius: 7px;
    background: rgba(127, 29, 29, 0.26);
    padding: 18px;
  }

  .library-strip {
    margin-top: 16px;
    padding: 18px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: center;
  }

  .library-strip p {
    margin: 6px 0 0;
    max-width: 760px;
    color: #cbd5e1;
    line-height: 1.6;
  }

  code {
    color: #67e8f9;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }

  .library-strip > code {
    white-space: nowrap;
    border: 1px solid rgba(103, 232, 249, 0.22);
    border-radius: 7px;
    padding: 10px 12px;
    background: rgba(8, 145, 178, 0.12);
  }

  @media (max-width: 860px) {
    main {
      width: min(100vw - 20px, 680px);
      padding-top: 18px;
    }

    .topbar,
    .library-strip {
      align-items: flex-start;
      flex-direction: column;
    }

    .workspace,
    .result-grid,
    .controls {
      grid-template-columns: 1fr;
    }

    .results {
      min-height: auto;
    }
  }
</style>
