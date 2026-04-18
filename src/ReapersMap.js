import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { benchmarks } from './data/benchmarks';
import './ReapersMap.css';
import { useState, useEffect } from 'react';
import { sendReport, fetchReports } from './services/reportService';

// Фикс иконок leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Функция получения цвета маркера в зависимости от статуса
const getMarkerColor = (status) => {
  if (status === 'alive') return 'green';
  if (status === 'destroyed') return 'red';
  return 'gray';
};

// Кастомная иконка с цветом
const createCustomIcon = (color) => {
  return L.divIcon({
    html: `<div style="
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: transform 0.2s;
    "></div>`,
    className: 'custom-marker',
    iconSize: [24, 24],
    popupAnchor: [0, -12]
  });
};

// Компонент для обработки кликов по карте
function MapClickHandler({ addingMode, onAddPoint }) {
  useMapEvents({
    click: (e) => {
      console.log('Клик по карте (useMapEvents), addingMode:', addingMode);
      if (addingMode) {
        console.log('Координаты:', e.latlng);
        onAddPoint({
          lat: e.latlng.lat,
          lng: e.latlng.lng
        });
      }
    }
  });
  return null;
}

// Компонент формы отчёта о репере
function ReperReportForm({ reper, onReportSent }) {
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

const handleSubmit = async () => {
  console.log('🔵 handleSubmit ВЫЗВАН');
  if (!status) {
    alert('Выберите статус репера');
    return;
  }

  setUploading(true);

  const report = {
    id: `report_${Date.now()}`,        // уникальный ID отчёта
    reperId: reper.id.toString(),      // ← ВАЖНО: отдельное поле с ID репера
    name: reper.name,
    lat: reper.lat,
    lng: reper.lng,
    status: status,
    comment: comment,
    author: 'Аноним',
    submittedAt: new Date().toISOString()
  };

  console.log('📤 Отправка отчёта:', report);

  const result = await sendReport(report);
  console.log('🔵 Результат sendReport:', result);

  alert('Отправлено! Спасибо за помощь. Отчёт будет проверен администратором.');
  setStatus('');
  setComment('');
  setPhoto(null);
  setPhotoPreview(null);
  if (onReportSent) onReportSent();
  setUploading(false);
};

  return (
    <div className="reper-card">
      <h3>{reper.name}</h3>
      <p>Координаты: {reper.lat.toFixed(6)}, {reper.lng.toFixed(6)}</p>

      <div className="status-buttons">
        <button
          onClick={() => setStatus('alive')}
          className={`btn-green ${status === 'alive' ? 'active' : ''}`}
        >
          ✅ Живой
        </button>
        <button
          onClick={() => setStatus('destroyed')}
          className={`btn-red ${status === 'destroyed' ? 'active' : ''}`}
        >
          💀 Уничтожен
        </button>
      </div>

      {status && (
        <div className="report-form">
          <textarea
            placeholder="Опишите состояние репера (например: 'снесён при строительстве', 'зарос кустами')"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows="3"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />

          {photoPreview && (
            <img
              src={photoPreview}
              alt="Предпросмотр"
              style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }}
            />
          )}

          <button onClick={handleSubmit} disabled={uploading}>
            {uploading ? 'Отправка...' : '📤 Отправить отчёт'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReapersMap() {
  const [reaperStatuses, setReaperStatuses] = useState({});
  const [addingMode, setAddingMode] = useState(false);
  const [tempPoint, setTempPoint] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Загружаем данные из Google Sheets при загрузке страницы
 useEffect(() => {
  const loadReports = async () => {
    setLoading(true);
    const result = await fetchReports();
    console.log('📥 Результат fetchReports:', result);

    if (result.success && result.data) {
      setReports(result.data);

      const newStatuses = {};
      result.data.forEach(report => {
        console.log('🔍 Обработка отчёта:', report);
        
        // Берём reperId или id
        let reperId = report.reperId || report.id;
        
        // Проверяем, что это НЕ новый пункт (не начинается с new_)
        if (reperId && !reperId.toString().startsWith('new_') && !reperId.toString().startsWith('report_')) {
          const reportStatus = report.status;
          
          // Проверяем, что статус валидный
          if (reportStatus === 'alive' || reportStatus === 'destroyed') {
            // Если reperId — число, используем его как число
            const numericId = parseInt(reperId);
            if (!isNaN(numericId)) {
              newStatuses[numericId] = reportStatus;
              console.log(`✅ Репер ${numericId} (${report.name}) → ${reportStatus}`);
            }
          }
        }
      });
      
      console.log('📊 Итоговые статусы:', newStatuses);
      setReaperStatuses(newStatuses);
    }
    setLoading(false);
  };

  loadReports();
}, []);

  // Загружаем сохранённые статусы из localStorage (если есть)
  useEffect(() => {
    const saved = localStorage.getItem('reaperStatuses');
    if (saved) {
      setReaperStatuses(JSON.parse(saved));
    }
  }, []);

  // Функция обработки выбора фото для нового пункта
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(null);
    }
  };

  // Функция отправки нового пункта от пользователя
  const submitNewPoint = async () => {
    console.log('🔵 submitNewPoint ВЫЗВАНА');

    const name = document.getElementById('pointName')?.value;
    if (!name) {
      alert('Введите название или номер пункта');
      return;
    }

    const newPoint = {
      id: `new_${Date.now()}`,
      name: name,
      lat: tempPoint.lat,
      lng: tempPoint.lng,
      type: document.getElementById('pointType')?.value || 'unknown',
      description: document.getElementById('pointComment')?.value || '',
      author: document.getElementById('pointAuthor')?.value || 'Аноним',
      photo: null,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    console.log('📤 Отправляем в Google Sheets:', JSON.stringify(newPoint, null, 2));

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz2tyCibJURnL0TsqwkJYge9YupO94NZz8ANrOlcbzcuG0MALLNoj4Az-JbAWLDa2pg/exec';

    try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPoint)
      });

      console.log('✅ Запрос отправлен (режим no-cors)');
      alert('Спасибо! Пункт отправлен на проверку администратору.');
      setTempPoint(null);
      setPhotoPreview(null);
      setAddingMode(false);

    } catch (error) {
      console.error('❌ Ошибка сети:', error);
      alert('Не удалось отправить данные. Проверьте подключение к интернету.');
    }
  };

  // Получение текущего отображаемого статуса репера
  const getCurrentStatus = (reaperId) => {
    return reaperStatuses[reaperId] || null;
  };





  

  return (
    <div className="app-container">
      {/* Индикатор загрузки */}
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Загрузка данных с сервера...</p>
        </div>
      )}

      <header className="header">
        <div className="header-content">
          <h1 className="title">
            <span className="title-icon">🗺️</span>
            Геодезический мониторинг Севастополя
          </h1>
          <p className="subtitle">
            В связи с нестабильной работой GNSS-оборудования (глушение сигнала) мы создаём
            альтернативную систему контроля состояния геодезических пунктов.
            Ваша помощь — основа точных измерений в сложных условиях.
          </p>
        </div>
      </header>

      <button
        className={`add-mode-btn ${addingMode ? 'active' : ''}`}
        onClick={() => {
          console.log('Кнопка нажата, текущий addingMode:', addingMode);
          setAddingMode(!addingMode);
        }}
      >
        {addingMode ? '❌ Отмена' : '➕ Добавить новый пункт'}
      </button>

      <main className="map-wrapper">
        {addingMode && (
          <div className="add-mode-hint">
            🔍 Кликните в любом месте карты, чтобы добавить новый пункт
          </div>
        )}

        <div className={`map-container ${addingMode ? 'add-mode-cursor' : ''}`}>
          <div style={{ position: 'relative', height: '500px', width: '100%' }}>
            <MapContainer
              center={[44.616, 33.525]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              className="leaflet-map"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              <MapClickHandler
                addingMode={addingMode}
                onAddPoint={(point) => {
                  console.log('Установка tempPoint:', point);
                  setTempPoint(point);
                  setAddingMode(false);
                }}
              />

              {/* Маркеры из benchmarks */}
              {benchmarks.map(point => {
                const status = getCurrentStatus(point.id);
                const markerColor = getMarkerColor(status);
                const customIcon = createCustomIcon(markerColor);

                return (
                  <Marker
                    key={point.id}
                    position={[point.lat, point.lng]}
                    icon={customIcon}
                  >
                    <Popup>
                      <ReperReportForm
                        reper={point}
                        onReportSent={() => {
                          console.log('Отчёт отправлен для', point.name);
                        }}
                      />
                    </Popup>
                  </Marker>
                );
              })}

{/* Пользовательские пункты из Google Sheets (где id начинается с new_) */}
{reports
  .filter(r => r.id && r.id.toString().startsWith('new_'))
  .map(point => {
    // Координаты уже преобразованы в fetchReports
    const lat = point.lat;
    const lng = point.lng;
    
    if (isNaN(lat) || isNaN(lng)) return null;
    
    return (
      <Marker
        key={point.id}
        position={[lat, lng]}
      >
        <Popup>
          <div className="popup-content">
            <h3>🆕 {point.name}</h3>
            <p><strong>Тип:</strong> {point.type}</p>
            <p><strong>Описание:</strong> {point.description}</p>
            <p><strong>Автор:</strong> {point.author}</p>
            <p><strong>Статус:</strong> {point.status}</p>
            <p><strong>Координаты:</strong> {lat.toFixed(6)}, {lng.toFixed(6)}</p>
            <hr />
            <p style={{ fontSize: '12px', color: '#666' }}>
              📅 {new Date(point.submittedAt).toLocaleString()}
            </p>
          </div>
        </Popup>
      </Marker>
    );
  })}





            </MapContainer>
          </div>
        </div>
      </main>

      {/* Оверлей формы добавления нового пункта */}
      {tempPoint && (
        <div className="add-point-overlay">
          <div className="add-point-form">
            <h3>➕ Новый геодезический пункт</h3>
            <p>Координаты: {tempPoint.lat.toFixed(6)}, {tempPoint.lng.toFixed(6)}</p>

            <input
              type="text"
              placeholder="Название/номер (обязательно)"
              id="pointName"
            />

            <select id="pointType" defaultValue="unknown">
              <option value="unknown">Неизвестно</option>
              <option value="wall">Стенной</option>
              <option value="ground">Грунтовый</option>
              <option value="fundamental">Пирамида</option>
            </select>

            <textarea
              placeholder="Описание, ориентиры, откуда известно о пункте..."
              id="pointComment"
              rows="3"
            />

            <input
              type="file"
              accept="image/*"
              id="pointPhoto"
              onChange={handlePhotoChange}
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="Предпросмотр"
                style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }}
              />
            )}

            <input
              type="text"
              placeholder="Ваше имя (опционально)"
              id="pointAuthor"
            />

            <div className="form-buttons">
              <button className="btn-submit" onClick={submitNewPoint}>Отправить на проверку</button>
              <button className="btn-cancel" onClick={() => {
                setTempPoint(null);
                setPhotoPreview(null);
              }}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-content">
          <div className="instruction">
            <h3>📖 Как пользоваться картой</h3>
            <ul>
              <li>🔍 <strong>Приближайте/отдаляйте</strong> карту с помощью колесика мыши или жестов на телефоне</li>
              <li>📍 <strong>Кликайте на маркер</strong> — откроется информация о геодезическом пункте</li>
              <li>✅ <strong>Подтвердите статус</strong> пункта (жив/уничтожен) и добавьте комментарий</li>
              <li>📸 <strong>Приложите фото</strong> — это поможет верификации</li>
              <li>➕ <strong>Нажмите кнопку "Добавить пункт"</strong> и кликните на карту, чтобы сообщить о новом пункте</li>
            </ul>
          </div>
          <div className="verification-note">
            <h3>🔒 Важные данные</h3>
            <p>
              <strong>Ваши отчёты появляются на карте только после проверки администратором.</strong><br />
              Это гарантирует достоверность информации и защищает от ложных сообщений.<br />
              Цвет маркера меняется автоматически после верификации:
            </p>
            <div className="legend">
              <span><span className="legend-dot green"></span> Жив (верифицирован)</span>
              <span><span className="legend-dot red"></span> Уничтожен (верифицирован)</span>
              <span><span className="legend-dot gray"></span> Нет данных / ожидает проверки</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}