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
  document.getElementById('kpiReceitas').textContent = formatCurrency(summary.total_receitas);
  document.getElementById('kpiDespesas').textContent = formatCurrency(summary.total_despesas);
  document.getElementById('kpiSaldo').textContent = formatCurrency(summary.saldo_liquido);
  document.getElementById('kpiTransacoesCount').textContent = summary.total_transacoes || 0;
}

function renderTransactionsTable(transactions) {
  const tbody = document.getElementById('transacoesTableBody');
  if (!tbody) return;

  if (!transactions || transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Nenhuma transação registrada neste período.</td></tr>`;
    updateBatchDeleteButtonState();
    return;
  }

  tbody.innerHTML = transactions.map(t => {
    const dataFmt = new Date(t.data_transacao).toLocaleDateString('pt-BR');
    const catNome = t.categoria ? t.categoria.nome : 'Sem Categoria';
    const isDespesa = t.tipo_transacao === 'despesa';
    const parcelasInfo = t.eh_parcelado ? ` (${t.parcela_atual}/${t.total_parcelas}x)` : '';

    return `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="row-checkbox" value="${t.id}" onclick="updateBatchDeleteButtonState()" style="cursor: pointer;">
        </td>
        <td>${dataFmt}</td>
        <td><strong>${t.descricao}</strong>${parcelasInfo}</td>
        <td>${catNome}</td>
        <td><span class="badge badge-pix">${t.metodo_pagamento || 'outros'}</span></td>
        <td><strong class="${isDespesa ? 'value-red' : 'value-green'}">${isDespesa ? '-' : '+'}${formatCurrency(t.valor)}</strong></td>
        <td>
          <button onclick="deleteTransaction('${t.id}')" class="btn btn-danger btn-sm">Excluir</button>
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
    btn.style.display = selected.length > 0 ? 'inline-flex' : 'none';
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

  const userName = userSelect.options[userSelect.selectedIndex].text;
  if (!confirm(`⚠️ ATENÇÃO: Deseja realmente excluir TODAS as transações do usuário "${userName}"?Esta ação não pode ser desfeita.`)) {
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
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum teto de gasto configurado para este mês.</p>`;
    return;
  }

  container.innerHTML = limites.map(l => {
    const perc = parseFloat(l.percentual_usado) || 0;
    let fillClass = 'fill-normal';
    if (perc >= 100) fillClass = 'fill-danger';
    else if (perc >= 80) fillClass = 'fill-warning';

    return `
      <div class="limit-item">
        <div class="limit-header">
          <span><strong>${l.categoria}</strong></span>
          <span>${formatCurrency(l.gasto_atual)} / ${formatCurrency(l.valor_limite)} (${l.percentual_usado})</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill ${fillClass}" style="width: ${Math.min(perc, 100)}%;"></div>
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
          '#6366f1', '#10b981', '#ef4444', '#f59e0b', '#38bdf8', '#ec4899', '#8b5cf6'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#94a3b8', font: { family: 'Inter' } }
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
