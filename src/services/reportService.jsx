// reportService.jsx
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzLTpBZb0jR9lH9nPwUuZjFvYGASCBd6THHZNqgkSZKXPUfW9l_lcPdaM56KjViTvp5/exec';

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
    
    // Более надёжный парсинг CSV с учётом пустых полей
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      // Разбиваем с учётом кавычек и пустых полей
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < lines[i].length; j++) {
        const char = lines[i][j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current); // последнее значение
      
      // Очищаем кавычки и пробелы
      const cleanValues = values.map(v => v.replace(/^"|"$/g, '').trim());
      
      const obj = {};
      headers.forEach((header, idx) => {
        let value = cleanValues[idx] || '';
        
        // Преобразуем lat/lng в числа
        if (header === 'lat' || header === 'lng') {
          value = parseFloat(value.replace(',', '.'));
        }
        
        obj[header] = value;
      });
      
      result.push(obj);
    }
    
    console.log('📥 [fetchReports] Получено записей:', result.length);
    console.log('📥 [fetchReports] Первая запись:', result[0]);
    return { success: true, data: result };
    
  } catch (error) {
    console.error('❌ [fetchReports] Ошибка:', error);
    return { success: false, error: error.message, data: [] };
  }
};