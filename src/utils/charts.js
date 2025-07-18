// File: src/utils/charts.js

export function updateChart(id, labels, data, label) {
  if (!window._charts) window._charts = {};
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn("Chart canvas not found:", id);
    return;
  }

  if (window._charts[id]) {
    window._charts[id].destroy();
    delete window._charts[id];
  }

  const ctx = canvas.getContext('2d');
  window._charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: '#43b5ffbb'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}
