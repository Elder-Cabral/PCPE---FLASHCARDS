"use client";

/**
 * @param {Date} date
 * @returns {string} "YYYY-MM-DD" no fuso local
 */
export function getLocalDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** @returns {string} "YYYY-MM-DD" no fuso local */
export function getTodayLocalStr() {
  const d = new Date();
  return getLocalDateString(d);
}

/**
 * Converte e limpa qualquer string de data para uma data local segura (meia-noite).
 * @param {string|Date} dateStr
 * @returns {Date|null}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const clean = typeof dateStr === 'string' ? dateStr.substring(0, 10) : getLocalDateString(new Date(dateStr));
  return new Date(clean + "T00:00:00");
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
 * @param {import('../types').SRSData} srsData
 * @returns {number}
 */
export function calculateStreak(srsData) {
  const dates = new Set();
  for (const id in srsData) {
    if (srsData[id] && srsData[id].lastReviewed) {
      const d = new Date(srsData[id].lastReviewed);
      dates.add(getLocalDateString(d));
    }
  }
  if (dates.size === 0) return 0;

  const todayStr = getLocalDateString(new Date());
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let current = dates.has(todayStr) ? new Date() : new Date(Date.now() - 24 * 60 * 60 * 1000);

  while (true) {
    const currentStr = getLocalDateString(current);
    if (dates.has(currentStr)) {
      streak++;
      current = new Date(current.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }
  return streak;
}
