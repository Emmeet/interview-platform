const FONT_SIZE = 11;
const LABEL_GAP = 16;

function numberText(value, format) {
  return format === 'percent' ? value.toFixed(1) + '%' : String(value);
}

function drawNumber(ctx, text, x, y, align = 'center') {
  ctx.textAlign = align;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 3;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#0f172a';
  ctx.fillText(text, x, y);
}

// 小分项与环形扇区使用引线，不因空间不足隐藏统计值。
function drawSideLabels(ctx, labels, top, bottom) {
  if (!labels.length) return;
  labels.sort((a, b) => a.anchorY - b.anchorY);
  const gap = Math.min(LABEL_GAP, (bottom - top) / Math.max(1, labels.length - 1));
  let previous = top - gap;
  for (const label of labels) {
    label.y = Math.max(top, label.anchorY, previous + gap);
    previous = label.y;
  }
  if (previous > bottom) {
    labels[labels.length - 1].y = bottom;
    for (let i = labels.length - 2; i >= 0; i -= 1) {
      labels[i].y = Math.min(labels[i].y, labels[i + 1].y - gap);
    }
  }
  for (const label of labels) {
    ctx.beginPath();
    ctx.strokeStyle = label.color;
    ctx.lineWidth = 1;
    ctx.moveTo(label.anchorX, label.anchorY);
    ctx.lineTo(label.x - label.side * 4, label.y);
    ctx.lineTo(label.x, label.y);
    ctx.stroke();
    drawNumber(ctx, label.text, label.x + label.side * 2, label.y, label.side > 0 ? 'left' : 'right');
  }
}

function drawBars(chart, metas, format) {
  const { ctx, chartArea } = chart;
  const horizontal = chart.options.indexAxis === 'y';
  const stacked = chart.options.scales?.[horizontal ? 'x' : 'y']?.stacked;
  if (stacked && !horizontal) {
    for (let index = 0; index < chart.data.labels.length; index += 1) {
      const sideLabels = [];
      let hasValue = false;
      let zeroBar;
      for (const meta of metas) {
        const raw = chart.data.datasets[meta.index].data[index];
        if (raw == null || raw === '' || !Number.isFinite(Number(raw))) continue;
        const value = Number(raw);
        const bar = meta.data[index];
        if (!bar || bar.skip) continue;
        zeroBar = bar;
        if (value === 0) continue;
        hasValue = true;
        const text = numberText(value, format);
        const width = ctx.measureText(text).width;
        const middleY = (bar.y + bar.base) / 2;
        if (Math.abs(bar.base - bar.y) >= FONT_SIZE + 8 && bar.width >= width + 6) {
          drawNumber(ctx, text, bar.x, middleY);
        } else {
          const right = bar.x + bar.width / 2;
          const side = right + width + 14 < chart.width ? 1 : -1;
          const anchorX = bar.x + side * bar.width / 2;
          sideLabels.push({ text, anchorX, anchorY: middleY, x: anchorX + side * 8, side, color: bar.options.backgroundColor });
        }
      }
      if (!hasValue && zeroBar) drawNumber(ctx, numberText(0, format), zeroBar.x, zeroBar.base - 9);
      drawSideLabels(ctx, sideLabels, chartArea.top + 7, chartArea.bottom - 7);
    }
    return;
  }

  const positioned = !horizontal && metas.length > 1 ? [] : null;
  for (const meta of metas) {
    const values = chart.data.datasets[meta.index].data;
    for (let index = 0; index < meta.data.length; index += 1) {
      const raw = values[index];
      if (raw == null || raw === '' || !Number.isFinite(Number(raw))) continue;
      const bar = meta.data[index];
      if (!bar || bar.skip) continue;
      const text = numberText(Number(raw), format);
      if (horizontal) {
        const positive = bar.x >= bar.base;
        drawNumber(ctx, text, bar.x + (positive ? 7 : -7), bar.y, positive ? 'left' : 'right');
      } else {
        const direction = bar.y <= bar.base ? -1 : 1;
        const originalY = bar.y + direction * 9;
        let y = originalY;
        if (positioned) {
          const width = ctx.measureText(text).width + 6;
          let step = direction;
          while (positioned.some((label) => Math.abs(label.x - bar.x) < (label.width + width) / 2 && Math.abs(label.y - y) < LABEL_GAP)) {
            y += step * LABEL_GAP;
            if (step === direction && (y < FONT_SIZE || y > chart.height - FONT_SIZE)) {
              step = -direction;
              y = bar.y - direction * 9;
            }
          }
          if (y !== originalY) {
            ctx.beginPath();
            ctx.strokeStyle = bar.options.backgroundColor;
            ctx.lineWidth = 1;
            ctx.moveTo(bar.x, bar.y);
            ctx.lineTo(bar.x, y - step * 7);
            ctx.stroke();
          }
          positioned.push({ x: bar.x, y, width });
        }
        drawNumber(ctx, text, bar.x, y);
      }
    }
  }
}

function drawDoughnut(chart, metas, format) {
  const left = [];
  const right = [];
  for (const meta of metas) {
    const values = chart.data.datasets[meta.index].data;
    for (let index = 0; index < meta.data.length; index += 1) {
      const value = Number(values[index]);
      const arc = meta.data[index];
      if (!chart.getDataVisibility(index) || !Number.isFinite(value) || value <= 0 || !arc || arc.endAngle === arc.startAngle) continue;
      const angle = (arc.startAngle + arc.endAngle) / 2;
      const side = Math.cos(angle) >= 0 ? 1 : -1;
      const text = numberText(value, format);
      const width = chart.ctx.measureText(text).width;
      const desiredX = arc.x + side * (arc.outerRadius + 12);
      const x = side > 0 ? Math.min(desiredX, chart.width - width - 6) : Math.max(desiredX, width + 6);
      (side > 0 ? right : left).push({
        text,
        anchorX: arc.x + Math.cos(angle) * arc.outerRadius,
        anchorY: arc.y + Math.sin(angle) * arc.outerRadius,
        x,
        side,
        color: arc.options.backgroundColor,
      });
    }
  }
  drawSideLabels(chart.ctx, left, chart.chartArea.top + 7, chart.chartArea.bottom - 7);
  drawSideLabels(chart.ctx, right, chart.chartArea.top + 7, chart.chartArea.bottom - 7);
}

const chartValueLabels = {
  id: 'chartValueLabels',
  afterDatasetsDraw(chart, _args, options) {
    if (chart.config.type !== 'bar' && chart.config.type !== 'doughnut') return;
    const metas = chart.getSortedVisibleDatasetMetas();
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = `600 ${FONT_SIZE}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif`;
    ctx.textBaseline = 'middle';
    if (chart.config.type === 'doughnut') drawDoughnut(chart, metas, options.format);
    else drawBars(chart, metas, options.format);
    ctx.restore();
  },
};

/**
 * 常驻人数/百分比标签，保留原 tooltip。
 * 小堆叠分项与环形扇区使用引线；并列柱自动错行，顶部不足时向柱内排布。
 * 百分比图设置 plugins.chartValueLabels.format='percent'。
 */
export function createLabeledChart(Chart, canvas, config) {
  config.plugins ||= [];
  config.plugins.push(chartValueLabels);
  config.options ||= {};
  config.options.layout ||= {};
  const existing = config.options.layout.padding || 0;
  const padding = typeof existing === 'number'
    ? { top: existing, right: existing, bottom: existing, left: existing }
    : existing;
  const doughnut = config.type === 'doughnut';
  const extraLabelRows = config.type === 'bar' && config.options.indexAxis !== 'y' && !config.options.scales?.y?.stacked
    ? Math.max(0, config.data.datasets.length - 1)
    : 0;
  config.options.layout.padding = {
    top: Math.max(padding.top || 0, 20 + extraLabelRows * LABEL_GAP),
    right: Math.max(padding.right || 0, doughnut ? 40 : 36),
    bottom: Math.max(padding.bottom || 0, doughnut ? 8 : 0),
    left: Math.max(padding.left || 0, doughnut ? 40 : 4),
  };
  return new Chart(canvas, config);
}
