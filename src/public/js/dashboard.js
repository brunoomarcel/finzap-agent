let categoryChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  const userSelect = document.getElementById('userSelect');
  const mesAnoSelect = document.getElementById('mesAnoSelect');

  if (userSelect) {
    userSelect.addEventListener('change', loadDashboardData);
  }
  if (mesAnoSelect) {
    mesAnoSelect.addEventListener('change', loadDashboardData);
  }

  loadDashboardData();
});

async function loadDashboardData() {
  const userSelect = document.getElementById('userSelect');
  const mesAnoSelect = document.getElementById('mesAnoSelect');

  if (!userSelect || !userSelect.value) {
    return;
  }

  const userId = userSelect.value;
  const mesAno = mesAnoSelect ? mesAnoSelect.value : '';

  // Reset select all checkbox & delete button
  const masterCb = document.getElementById('selectAllCheckbox');
  if (masterCb) masterCb.checked = false;
  updateBatchDeleteButtonState();

  try {
    // 1. Fetch Summary (KPIs, Limits, Category breakdown)
    const summaryRes = await fetch(`/api/summary?usuario_id=${userId}&mes_ano=${mesAno}`);
    const summaryData = await summaryRes.json();

    if (summaryData.success) {
      renderKPIs(summaryData.data);
      renderLimites(summaryData.data.status_limites);
      renderChart(summaryData.data.gastos_por_categoria);
    }

    // 2. Fetch Transactions List
    const transRes = await fetch(`/api/transactions?usuario_id=${userId}&limit=100`);
    const transData = await transRes.json();

    if (transData.success) {
      renderTransactionsTable(transData.data);
    }

  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function renderKPIs(summary) {
  const receitasEl = document.getElementById('kpiReceitas');
  const despesasEl = document.getElementById('kpiDespesas');
  const saldoEl = document.getElementById('kpiSaldo');
  const transCountEl = document.getElementById('kpiTransacoesCount');

  if (receitasEl) receitasEl.textContent = formatCurrency(summary.total_receitas);
  if (despesasEl) despesasEl.textContent = formatCurrency(summary.total_despesas);
  if (saldoEl) saldoEl.textContent = formatCurrency(summary.saldo_liquido);
  if (transCountEl) transCountEl.textContent = summary.total_transacoes || 0;
}

function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transacoesTableBody');
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="px-4 py-6 text-center text-sm text-slate-500">Nenhuma transação registrada neste período.</td></tr>`;
    updateBatchDeleteButtonState();
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const dataFmt = new Date(t.data_transacao).toLocaleDateString('pt-BR');
    const catNome = t.categoria ? t.categoria.nome : 'Sem Categoria';
    const isDespesa = t.tipo_transacao === 'despesa';
    const parcelasInfo = t.eh_parcelado ? ` (${t.parcela_atual}/${t.total_parcelas}x)` : '';

    return `
      <tr class="hover:bg-slate-50/80 border-b border-slate-100 transition-colors">
        <td class="px-3 py-3 text-center">
          <input type="checkbox" class="row-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" value="${t.id}" onclick="updateBatchDeleteButtonState()">
        </td>
        <td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">${dataFmt}</td>
        <td class="px-4 py-3 text-sm font-semibold text-slate-800 whitespace-nowrap">${t.descricao}${parcelasInfo}</td>
        <td class="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">${catNome}</td>
        <td class="px-4 py-3 text-sm whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase bg-sky-50 text-sky-700 border border-sky-200">${t.metodo_pagamento || 'outros'}</span>
        </td>
        <td class="px-4 py-3 text-sm font-bold whitespace-nowrap ${isDespesa ? 'text-red-600' : 'text-emerald-600'}">
          ${isDespesa ? '-' : '+'}${formatCurrency(t.valor)}
        </td>
        <td class="px-4 py-3 text-sm whitespace-nowrap">
          <button onclick="deleteTransaction('${t.id}')" class="px-2.5 py-1 text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded transition-colors active:scale-95">Excluir</button>
        </td>
      </tr>
    `;
  }).join('');

  updateBatchDeleteButtonState();
}

function toggleSelectAll(masterCheckbox) {
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = masterCheckbox.checked;
  });
  updateBatchDeleteButtonState();
}

function updateBatchDeleteButtonState() {
  const selected = document.querySelectorAll('.row-checkbox:checked');
  const btn = document.getElementById('btnDeleteSelected');
  const countSpan = document.getElementById('selectedCount');

  if (btn && countSpan) {
    countSpan.textContent = selected.length;
    if (selected.length > 0) {
      btn.classList.remove('hidden');
      btn.classList.add('inline-flex');
    } else {
      btn.classList.remove('inline-flex');
      btn.classList.add('hidden');
    }
  }
}

async function deleteSelectedTransactions() {
  const selected = document.querySelectorAll('.row-checkbox:checked');
  const ids = Array.from(selected).map(cb => cb.value);

  if (ids.length === 0) return;

  if (!confirm(`Excluir as ${ids.length} transações selecionadas?`)) return;

  try {
    const res = await fetch('/api/transactions/delete-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });

    const data = await res.json();
    if (data.success) {
      loadDashboardData();
    } else {
      alert('Erro ao excluir: ' + data.error);
    }
  } catch (err) {
    alert('Erro de conexão: ' + err.message);
  }
}

async function deleteAllTransactionsForUser() {
  const userSelect = document.getElementById('userSelect');
  if (!userSelect || !userSelect.value) return;

  if (!confirm(`ATENÇÃO: Deseja realmente excluir TODAS as transações deste usuário? Esta ação não pode ser desfeita.`)) {
    return;
  }

  try {
    const res = await fetch('/api/transactions/delete-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: userSelect.value })
    });

    const data = await res.json();
    if (data.success) {
      loadDashboardData();
    } else {
      alert('Erro ao excluir: ' + data.error);
    }
  } catch (err) {
    alert('Erro de conexão: ' + err.message);
  }
}

function renderLimites(limites) {
  const container = document.getElementById('limitesContainer');
  if (!container) return;

  if (!limites || limites.length === 0) {
    container.innerHTML = `<p class="text-xs sm:text-sm text-slate-500">Nenhum teto de gasto configurado para este mês.</p>`;
    return;
  }

  container.innerHTML = limites.map(l => {
    const perc = parseFloat(l.percentual_usado) || 0;
    let fillClass = 'bg-emerald-500';
    if (perc >= 100) fillClass = 'bg-red-500';
    else if (perc >= 80) fillClass = 'bg-amber-500';

    return `
      <div class="space-y-1.5">
        <div class="flex justify-between text-xs sm:text-sm font-medium text-slate-700">
          <span>${l.categoria}</span>
          <span class="text-slate-500">${formatCurrency(l.gasto_atual)} / ${formatCurrency(l.valor_limite)} (${l.percentual_usado})</span>
        </div>
        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-300 ${fillClass}" style="width: ${Math.min(perc, 100)}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderChart(gastosPorCategoria) {
  const canvas = document.getElementById('categoryChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const labels = Object.keys(gastosPorCategoria || {});
  const values = Object.values(gastosPorCategoria || {});

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  if (labels.length === 0) {
    return;
  }

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#2563eb', '#16a34a', '#dc2626', '#d97706', '#0284c7', '#db2777', '#9333ea'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: window.innerWidth < 640 ? 'bottom' : 'right',
          labels: { color: '#475569', font: { family: 'Inter', size: window.innerWidth < 640 ? 11 : 12 } }
        }
      }
    }
  });
}

async function deleteTransaction(id) {
  if (!confirm('Excluir esta transação?')) return;
  try {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadDashboardData();
    } else {
      alert('Erro ao excluir: ' + data.error);
    }
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}
