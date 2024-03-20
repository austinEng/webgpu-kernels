import benchmarks from '../benchmarks';
import { Benchmark } from '../bench/test';

type Result = { case_name: string, min: number, max: number, avg: number, med: number, std_dev: number };

const test_results: Map<string, Result[]> = new Map();

const getCellValue = (tr: Element, idx: number) => (tr.children[idx] as HTMLElement).innerText || tr.children[idx].textContent;

const comparer = (idx: number, ascending: boolean) => (a: Element, b: Element) => ((v1, v2) => {
  const n1 = v1 as unknown as number;
  const n2 = v2 as unknown as number;
  return v1 !== '' && v2 !== '' && !isNaN(n1) && !isNaN(n2)
    ? n1 - n2 : (v1 as string).toString().localeCompare(v2 as string);
})(getCellValue(ascending ? a : b, idx), getCellValue(ascending ? b : a, idx));

function addSort(th: HTMLTableCellElement) {
  let asc: boolean | undefined = undefined;
  th.classList.add('sortable');
  th.addEventListener('click', (() => {
    const table = th.closest('table')!;
    table.querySelectorAll('.sortable').forEach(s => {
      s.classList.remove('sort-up');
      s.classList.remove('sort-down');
    });
    Array.from(table.querySelectorAll('tr:nth-child(n+2)'))
      .sort(comparer(Array.from(th.parentNode!.children).indexOf(th), asc = !asc))
      .forEach(tr => table.appendChild(tr));

    if (asc === true) {
      th.classList.remove('sort-down');
      th.classList.add('sort-up');
    } else if (asc === false) {
      th.classList.remove('sort-up');
      th.classList.add('sort-down');
    }
  }));

}

const queryParams = new URLSearchParams(window.location.search);
for (const [name, b] of Object.entries(benchmarks)) {
  const link = document.createElement('a');
  link.innerText = name;
  link.href = `./?benchmark=${name}`;
  link.classList.add('benchmark-link');
  document.body.appendChild(link);

  if (name !== queryParams.get('benchmark')) {
    continue;
  }
  const suiteContainer = document.createElement('div');
  document.body.appendChild(suiteContainer);

  const suiteHeading = document.createElement('h3');
  suiteHeading.innerText = name;
  suiteContainer.appendChild(suiteHeading);

  const suiteResults = document.createElement('table');
  suiteContainer.appendChild(suiteResults);

  const tableRowHead = document.createElement('tr');
  suiteResults.appendChild(tableRowHead);
  for (const heading of ['case', 'min', 'max', 'avg', 'med', 'std_dev']) {
    const th = document.createElement('th');
    th.innerText = heading;
    tableRowHead.appendChild(th);
    addSort(th);
  }

  for (const [case_name, params] of Object.entries(b.cases)) {
    console.log(name, case_name);
    let results: Result[] = [];
    test_results.set(name, results);

    let device: GPUDevice | undefined;
    try {
      const t = b.generateTest(params);

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        continue;
      }
      device = await adapter.requestDevice({
        requiredLimits: t.requiredLimits,
        requiredFeatures: t.requiredFeatures,
      });
      if (!device) {
        continue;
      }

      const run = t.test(device);

      // warmup
      for (let i = 0; i < 3; ++i) {
        run(10);
      }
      // calibration
      let avgTime = 0;
      for (let i = 0; i < 5; ++i) {
        avgTime += (await run(10).getTime()) / 5;
      }
      // compute number of runs to hit 0.1 seconds.
      const n = Math.ceil((1e9 * 0.1) / avgTime);
      // perform 10 trials.
      const trial_results = new Array(10);
      for (let i = 0; i < trial_results.length; ++i) {
        trial_results[i] = 10e-3 * await run(n).getTime(); // convert to microseconds
      }
      const min = trial_results.reduce((a, b) => Math.min(a, b));
      const max = trial_results.reduce((a, b) => Math.max(a, b));
      const avg = trial_results.reduce((a, b) => a + b) / trial_results.length;
      const med = trial_results.sort()[Math.floor(trial_results.length / 2)];
      const std_dev = Math.sqrt(trial_results.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b) / trial_results.length);
      const r = { case_name, min, max, avg, med, std_dev };
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
    } catch (err) {
      console.warn(err);
      continue;
    } finally {
      if (device) {
        device.destroy();
      }
    }
  }
}