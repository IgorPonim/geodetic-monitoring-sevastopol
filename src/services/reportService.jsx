// reportService.js
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPgyMG9IwgE1PXn3JP25pF2oenfi_aRTVNAvRroavbetwIQo5GMX1F3akyGMhMR7mL/exec';

export const sendReport = async (reportData) => {
  try {
    console.log('📤 [sendReport] Отправка данных:', JSON.stringify(reportData, null, 2));
    console.log('📤 [sendReport] URL:', SCRIPT_URL);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
        mode: 'no-cors', // ← добавляем эту строку
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData)
    });

    // Логируем статус ответа
    console.log('📥 [sendReport] Статус ответа:', response.status);
    console.log('📥 [sendReport] Статус текст:', response.statusText);
    console.log('📥 [sendReport] Заголовки:', [...response.headers.entries()]);
    
    // Пытаемся прочитать ответ в любом случае
    let responseText = '';
    try {
      responseText = await response.text();
      console.log('📥 [sendReport] Тело ответа (текст):', responseText);
    } catch (textError) {
      console.error('❌ [sendReport] Не удалось прочитать тело ответа:', textError);
      responseText = 'Не удалось прочитать ответ';
    }
    
    // Пытаемся распарсить JSON, если получится
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
      console.log('📥 [sendReport] Тело ответа (JSON):', responseData);
    } catch (jsonError) {
      console.log('📥 [sendReport] Ответ не в формате JSON (или пустой)');
    }
    
    // Проверяем успешность запроса
    if (response.ok) {
      console.log('✅ [sendReport] Запрос успешен!');
      return { success: true, data: responseData, status: response.status };
    } else {
      console.error('❌ [sendReport] Сервер вернул ошибку:', response.status);
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${response.statusText}`,
        responseText: responseText,
        status: response.status
      };
    }
    
  } catch (error) {
    console.error('❌ [sendReport] Ошибка при выполнении fetch:', error);
    console.error('❌ [sendReport] Тип ошибки:', error.name);
    console.error('❌ [sendReport] Сообщение:', error.message);
    
    // Дополнительная диагностика для сетевых ошибок
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error('🔍 [sendReport] Это可能是 CORS ошибка или проблема с сетью');
      console.error('🔍 [sendReport] Проверьте:');
      console.error('    1. Правильный ли URL?');
      console.error('    2. Есть ли интернет?');
      console.error('    3. Не блокирует ли браузер запрос?');
    }
    
    return { 
      success: false, 
      error: error.message,
      errorType: error.name
    };
  }
};