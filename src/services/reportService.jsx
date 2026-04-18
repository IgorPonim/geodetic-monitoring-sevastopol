// reportService.jsx
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2HN8-sf43e-xtmusQ-vfiQ0Oggf5sh5OoT02G6cqbols3Zpb-fxcre5FvucBMo8T9/exec';

// Публичная CSV-ссылка на вашу таблицу (замените на свою)
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ2425v6IB81nrSqm8M3tO0uYd6dnoB3vLeLvnLYM3HYgHLGJ_y0qczd4RofClIJjfoTNMq_Vz-xlOX/pub?output=csv';

// Отправка отчёта (POST) — оставляем как есть
export const sendReport = async (reportData) => {
  try {
    console.log('📤 [sendReport] Отправка данных:', JSON.stringify(reportData, null, 2));
    
    await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData)
    });
    
    console.log('✅ [sendReport] Запрос отправлен');
    return { success: true };
    
  } catch (error) {
    console.error('❌ [sendReport] Ошибка:', error);
    return { success: false, error: error.message };
  }
};

// reportService.jsx
export const fetchReports = async () => {
  try {
    console.log('📥 [fetchReports] Загрузка данных из CSV...');
    
    const response = await fetch(CSV_URL);
    const csvText = await response.text();
    
    // Парсим CSV
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      let values;
      if (lines[i].includes('"')) {
        values = lines[i].match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)
          .map(v => v.replace(/^"|"$/g, '').trim());
      } else {
        values = lines[i].split(',').map(v => v.trim());
      }
      
      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = values[idx] || '';
      });
      
      // Преобразуем lat/lng из строки с запятой в число
      if (obj.lat) obj.lat = parseFloat(obj.lat.replace(',', '.'));
      if (obj.lng) obj.lng = parseFloat(obj.lng.replace(',', '.'));
      
      result.push(obj);
    }
    
    console.log('📥 [fetchReports] Получено записей:', result.length);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('❌ [fetchReports] Ошибка:', error);
    return { success: false, error: error.message, data: [] };
  }
};