"use client";

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD" no fuso local do dispositivo
 * @deprecated Use getTodayBR() ou getDateBR() para fuso fixo de Brasília
 */
export function getLocalDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** @returns {string} "YYYY-MM-DD" no fuso local do dispositivo */
export function getTodayLocalStr() {
  const d = new Date();
  return getLocalDateString(d);
}

/** @returns {string} "YYYY-MM-DD" no fuso de Brasília (America/Sao_Paulo, UTC-3) */
export function getTodayBR() {
  return new Date()
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/').reverse().join('-');
}

/** @returns {string} "YYYY-MM-DD" de ontem no fuso Brasília */
export function getYesterdayBR() {
  const brStr = new Date()
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const [d, m, y] = brStr.split('/').map(Number);
  const yesterday = new Date(y, m - 1, d - 1);
  return `${String(yesterday.getFullYear()).padStart(4, '0')}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
}

/**
 * Converte timestamp ms para "YYYY-MM-DD" no fuso Brasília.
 * @param {number} timestamp ms
 * @returns {string}
 */
export function getDateBR(timestamp) {
  return new Date(timestamp)
    .toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    .split('/').reverse().join('-');
}

/**
 * Converte string de data para Date à meia-noite no fuso Brasília (UTC-3).
 * @param {string|Date} dateStr
 * @returns {Date|null}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const clean = typeof dateStr === 'string' ? dateStr.substring(0, 10) : getLocalDateString(new Date(dateStr));
  return new Date(clean + "T00:00:00-03:00");
}

/**
 * Verifica se duas datas (string "YYYY-MM-DD") são consecutivas.
 * @param {string} prevDateStr
 * @param {string} todayStr
 * @returns {boolean}
 */
export function isConsecutiveDay(prevDateStr, todayStr) {
  const prev = parseLocalDate(prevDateStr);
  const today = parseLocalDate(todayStr);
  if (!prev || !today) return false;
  const diff = Math.floor((today - prev) / 86400000);
  return diff === 1;
}

/**
 * Calcula streak de dias consecutivos de estudo a partir do SRSData.
 * Usa o fuso Brasília para garantir consistência entre dispositivos.
 * @param {import('../types').SRSData} srsData
 * @returns {number}
 */
export function calculateStreak(srsData) {
  const dates = new Set();
  for (const id in srsData) {
    if (srsData[id] && srsData[id].lastReviewed) {
      dates.add(getDateBR(srsData[id].lastReviewed));
    }
  }
  if (dates.size === 0) return 0;

  const todayStr = getTodayBR();
  const yesterdayStr = getYesterdayBR();

  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let currentStr = dates.has(todayStr) ? todayStr : yesterdayStr;

  while (dates.has(currentStr)) {
    streak++;
    const [y, m, d] = currentStr.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    currentStr = `${String(prev.getFullYear()).padStart(4, '0')}-${String(prev.getMonth() + 1).padStart(2, '0')}-${String(prev.getDate()).padStart(2, '0')}`;
  }
  return streak;
}
