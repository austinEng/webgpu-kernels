import benchmarks from '../benchmarks';
import { Benchmark } from '../bench/test';

type Result = { case_name: string, min: number, max: number, avg: number, med: number, std_dev: number, n: number };

const test_results: Map<string, Result[]> = new Map();

const getCellValue = (tr: Element, idx: number) => (tr.children[idx] as HTMLElement).innerText || tr.children[idx].textContent;

const comparer = (idx: number, ascending: boolean) => (a: Element, b: Element) => ((v1, v2) => {
  const n1 = v1 as unknown as number;
  const n2 = v2 as unknown as number;
  return v1 !== '' && v2 !== '' && !isNaN(n1) && !isNaN(n2)
    ? n1 - n2 : (v1 as string).toString().localeCompare(v2 as string);
})(getCellValue(ascending ? a : b, idx), getCellValue(ascending ? b : a, idx));

let doSort = () => {};
function addSort(th: HTMLTableCellElement) {
  let asc: boolean = true;
  th.classList.add('sortable');
  th.addEventListener('click', (() => {
    const table = th.closest('table')!;
    table.querySelectorAll('.sortable').forEach(s => {
      s.classList.remove('sort-up');
      s.classList.remove('sort-down');
    });

    doSort = () => {
      Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
        .sort(comparer(Array.from(th.parentNode!.children).indexOf(th), !asc))
        .forEach(tr => table.appendChild(tr));
    };
    doSort();
    if (asc === true) {
      th.classList.remove('sort-down');
      th.classList.add('sort-up');
    } else if (asc === false) {
      th.classList.remove('sort-up');
      th.classList.add('sort-down');
    }
    asc = !asc
  }));

}

const queryParams = new URLSearchParams(window.location.search);
const powerPreference = queryParams.get('powerPreference');
for (const [name,] of Object.entries(benchmarks)) {
  const link = document.createElement('a');
  link.innerText = name;
  link.href = `./?benchmark=${name}`;
  link.classList.add('benchmark-link');
  document.body.appendChild(link);
}

for (const [name, b] of Object.entries(benchmarks)) {
  if (name !== queryParams.get('benchmark')) {
    continue;
  }
  const suiteContainer = document.createElement('div');
  document.body.appendChild(suiteContainer);

  const suiteHeading = document.createElement('h3');
  suiteHeading.innerText = name;
  suiteContainer.appendChild(suiteHeading);

  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;
  suiteContainer.appendChild(progress);

  const suiteResults = document.createElement('table');
  suiteContainer.appendChild(suiteResults);

  const tableRowHead = document.createElement('tr');
  suiteResults.appendChild(tableRowHead);
  for (const heading of ['case', 'min', 'max', 'avg', 'med', 'std_dev', 'n']) {
    const th = document.createElement('th');
    th.innerText = heading;
    tableRowHead.appendChild(th);
    addSort(th);
    if (heading === 'med') {
      th.click()
    }
  }

  progress.max = b.cases.length;

  if (b.cases.length === 0) {
    continue;
  }

  type GenerateTestFn = (typeof b)['generateTest'];
  type Params = Parameters<GenerateTestFn>[0];

  let i = 0;
  async function runCase(params: Params) {
    console.log(`${++i} ${name} ${params.toString()}`);
    let device: GPUDevice | undefined;
    try {
      const t = b.generateTest(params as any);

      const opts: GPURequestAdapterOptions = {};
      if (powerPreference) {
        opts.powerPreference = powerPreference as GPUPowerPreference;
      }
      const adapter = await navigator.gpu.requestAdapter(opts);
      if (!adapter) {
        return;
      }
      device = await adapter.requestDevice({
        requiredLimits: t.requiredLimits,
        requiredFeatures: t.requiredFeatures,
      });
      device.onuncapturederror = function(err) {
        console.error(err);
      }
      if (!device) {
        return;
      }

      const run = t.test(device);

      // warmup
      await run(10);
      // calibration
      let avgTime = 0;
      for (let i = 0; i < 3; ++i) {
        avgTime += (await run(10).getTime()) / 3;
      }
      if (avgTime === 0) {
        throw new Error('Invalid calibration');
      }
      // compute number of runs to hit 0.05 seconds.
      const n = Math.max(Math.ceil((1e9 * 0.05) / avgTime), 5);
      // perform 5 trials.
      const trial_results = new Array(5);
      for (let i = 0; i < trial_results.length; ++i) {
        trial_results[i] = 10e-3 * await run(n).getTime(); // convert to microseconds
      }
      const min = trial_results.reduce((a, b) => Math.min(a, b));
      const max = trial_results.reduce((a, b) => Math.max(a, b));
      const avg = trial_results.reduce((a, b) => a + b) / trial_results.length;
      const med = trial_results.sort()[Math.floor(trial_results.length / 2)];
      const std_dev = Math.sqrt(trial_results.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / trial_results.length);
      const r = { case_name: params.toString(), min, max, avg, med, std_dev, n };
      results.push(r);

      const tableRow = document.createElement('tr');
      for (let v of Object.values(r)) {
        const tableCell = document.createElement('td');
        if (typeof v === 'number') {
          v = Math.round(v * 1000) / 1000;
        }
        tableCell.innerText = v;
        tableRow.appendChild(tableCell);
      }
      suiteResults.appendChild(tableRow);
      doSort();

      return med;
    } catch (err) {
      console.warn(err);
      return;
    } finally {
      if (device) {
        device.destroy();
      }
      progress.value = i;
    }
  }

  // Build the set of cases, and a map of the parameter space.
  // We'll iterate the parameter space to try to search for other cases
  // which look similar to the current best case.
  const param_space: Record<string, Map<string, any>> = {};
  const pending_case_map: Map<string, Params> = new Map();
  for (const c of b.cases) {
    pending_case_map.set(c.toString(), c);
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === 'function') {
        continue;
      }
      if (!param_space[k]) {
        param_space[k] = new Map();
      }
      param_space[k].set(JSON.stringify(v),v);
    }
  }

  let results: Result[] = [];
  test_results.set(name, results);

  const caseQuery = queryParams.get('case');
  if (caseQuery != null) {
    await runCase(pending_case_map.get(caseQuery)!);
    continue;
  }

  console.log(`Running ${b.cases.length} cases of ${name}...`);

  while (pending_case_map.size > 0) {
    // Get a random case to use as a starting point.
    let c = Array.from(pending_case_map.values())[Math.floor(Math.random() * pending_case_map.size)]
    // .next().value;

    let bestTime: number | undefined;
    let didRunCase = false;
    do {
      didRunCase = false;
      // Iterate the dimensions of the parameter space.
      for (const dim of Object.keys(param_space)) {
        // Iterate through the values of `dim`.
        for (const v of param_space[dim].values()) {
          // Get the key for `c` using value `v` for `dim`.
          const k = {
            ...c,
            [dim]: v
          }.toString();
          const candidate = pending_case_map.get(k);
          if (!candidate) {
            // If this is not a real case, skip it.
            continue;
          }
          // Remove it from the pending cases since we will run it now.
          pending_case_map.delete(k);
          // Run the case.
          let candidateTime: number | undefined = await runCase(candidate);
          if (candidateTime === undefined) {
            continue;
          }
          didRunCase = true;
          // If this is the best case so far, save it.
          if (bestTime === undefined || candidateTime < bestTime) {
            bestTime = candidateTime;
            c = candidate;
          }
        }
      }
    } while (didRunCase);
  }
}