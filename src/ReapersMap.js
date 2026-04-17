import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { reapersData } from './reapersData';
import './ReapersMap.css';
import { useState, useEffect } from 'react';

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

export default function ReapersMap() {
  // Состояние для хранения статусов реперов (загружаем из localStorage)
  const [reaperStatuses, setReaperStatuses] = useState({});
  const [addingMode, setAddingMode] = useState(false);
  const [tempPoint, setTempPoint] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // Загружаем сохранённые статусы при загрузке
  useEffect(() => {
    const saved = localStorage.getItem('reaperStatuses');
    if (saved) {
      setReaperStatuses(JSON.parse(saved));
    }
  }, []);

  // Функция отправки отчёта о состоянии существующего репера
  const sendReport = (reaperId, status, comment) => {
    // Проверяем, не отправлял ли пользователь уже отчёт для этого репера сегодня
    const lastReport = localStorage.getItem(`report_${reaperId}`);
    if (lastReport) {
      const lastReportTime = JSON.parse(lastReport).timestamp;
      const hoursPassed = (Date.now() - lastReportTime) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        alert('Вы уже отправляли отчёт для этого репера сегодня. Спасибо! Новый отчёт можно отправить завтра.');
        return;
      }
    }

    // Сохраняем отчёт в localStorage (имитация отправки на сервер)
    const report = {
      reaperId,
      status,
      comment,
      timestamp: Date.now(),
      verified: false // не верифицирован
    };

    // Сохраняем сам отчёт
    localStorage.setItem(`report_${reaperId}_${Date.now()}`, JSON.stringify(report));

    // Обновляем статус репера только после верификации (пока не обновляем)
    alert('Спасибо! Ваш отчёт отправлен на верификацию. После проверки администратором статус репера обновится.');
  };

  // Функция обработки выбора фото
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
    const name = document.getElementById('pointName').value;
    if (!name) {
      alert('Введите название или номер пункта');
      return;
    }
    
    let photoData = null;
    const photoFile = document.getElementById('pointPhoto').files[0];
    if (photoFile) {
      const reader = new FileReader();
      photoData = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(photoFile);
      });
    }
    
    const newPoint = {
      id: `new_${Date.now()}`,
      name: name,
      lat: tempPoint.lat,
      lng: tempPoint.lng,
      type: document.getElementById('pointType').value,
      description: document.getElementById('pointComment').value,
      author: document.getElementById('pointAuthor').value,
      photo: photoData,
      status: 'pending',
      submittedAt: new Date().toISOString()
    };
    
    // Пока сохраняем в localStorage, потом заменим на Google Sheets
    const pendingPoints = JSON.parse(localStorage.getItem('pendingPoints') || '[]');
    pendingPoints.push(newPoint);
    localStorage.setItem('pendingPoints', JSON.stringify(pendingPoints));
    
    alert('Спасибо! Пункт отправлен на проверку администратору.');
    setTempPoint(null);
    setPhotoPreview(null);
    setAddingMode(false);
  };

  // Получение текущего отображаемого статуса репера (только верифицированные)
  const getCurrentStatus = (reaperId) => {
    // В реальном приложении здесь будет запрос к Google Sheets/Firebase
    // Пока просто заглушка - все серые
    return reaperStatuses[reaperId] || null;
  };

  console.log('Режим добавления:', addingMode);

  return (
    <div className="app-container">
      {/* Шапка сайта */}
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
        {/* Кнопка добавления нового пункта - в шапке */}
       
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
      {/* Основной контент - карта */}
      <main className="map-wrapper">
        {/* Подсказка при режиме добавления */}
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

              {/* Обработчик кликов по карте */}
              <MapClickHandler 
                addingMode={addingMode} 
                onAddPoint={(point) => {
                  console.log('Установка tempPoint:', point);
                  setTempPoint(point);
                  setAddingMode(false);
                }} 
              />
 
              {reapersData.map(reaper => {
                const status = getCurrentStatus(reaper.id);
                const markerColor = getMarkerColor(status);
                const customIcon = createCustomIcon(markerColor);
                
                return (
                  <Marker
                    key={reaper.id}
                    position={[reaper.lat, reaper.lng]}
                    icon={customIcon}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h3>{reaper.name}</h3>
                        <p><strong>Тип:</strong> {reaper.type}</p>
                        <p><strong>Высота:</strong> {reaper.height} м</p>
                        <p><strong>Описание:</strong> {reaper.description}</p>
                        <div className="popup-actions">
                          <button
                            className="btn-alive"
                            onClick={() => {
                              const comment = prompt('Подтверждение: что вы видите? (например, "репер на месте, цел")');
                              if (comment) sendReport(reaper.id, 'alive', comment);
                            }}
                          >
                            ✅ Подтвердить, что жив
                          </button>
                          <button
                            className="btn-destroyed"
                            onClick={() => {
                              const comment = prompt('Причина уничтожения? (например, "снесён при строительстве")');
                              if (comment) sendReport(reaper.id, 'destroyed', comment);
                            }}
                          >
                            💀 Сообщить об уничтожении
                          </button>
                        </div>
                        {status && (
                          <div className={`status-badge status-${status}`}>
                            {status === 'alive' ? '🟢 Жив' : status === 'destroyed' ? '🔴 Уничтожен' : '⚪ Нет данных'}
                          </div>
                        )}
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

            <select id="pointType">
              <option value="unknown">Неизвестно</option>
              <option value="wall">Стенной</option>
              <option value="ground">Грунтовый</option>
              <option value="fundamental">Фундаментальный</option>
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

            <input type="text" placeholder="Ваше имя (опционально)" id="pointAuthor" />

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
      
      {/* Нижняя панель с инструкцией */}
      <footer className="footer">
        <div className="footer-content">
          <div className="instruction">
            <h3>📖 Как пользоваться картой</h3>
            <ul>
              <li>🔍 <strong>Приближайте/отдаляйте</strong> карту с помощью колесика мыши или жестов на телефоне</li>
              <li>📍 <strong>Кликайте на маркер</strong> — откроется информация о геодезическом пункте</li>
              <li>✅ <strong>Подтвердите статус</strong> пункта (жив/уничтожен) и добавьте комментарий</li>
              <li>📸 <strong>Фото будут добавлены позже</strong> — вы сможете приложить снимок к отчёту</li>
              <li>➕ <strong>Нажмите кнопку "Добавить пункт"</strong> и кликните на карту, чтобы сообщить о неизвестном мне пункте</li>
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