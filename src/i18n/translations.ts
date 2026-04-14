export type Language = 'uz' | 'en' | 'ru';

export const translations = {
  uz: {
    login: {
      title: "Tizimga kirish",
      username: "Foydalanuvchi nomi",
      password: "Parol",
      secretCode: "Maxfiy kod",
      submit: "Kirish",
      error: "Noto'g'ri ma'lumotlar",
    },
    dashboard: {
      start: "Boshlash",
      upload: "Rasmni yuklang",
      uploadHint: "JPG yoki PNG formatdagi 2D plan rasmini yuklang",
      dragDrop: "Faylni bu yerga tashlang",
      orClick: "yoki bosing",
      processing: "Qayta ishlanmoqda...",
      detecting: "Devorlar aniqlanmoqda...",
      generating: "3D model yaratilmoqda...",
      exporting: "DXF fayl tayyorlanmoqda...",
      download: "DXF yuklab olish",
      newProject: "Yangi loyiha",
      logout: "Chiqish",
      success: "DXF fayl tayyor!",
      error: "Xatolik yuz berdi",
      wallHeight: "Devor balandligi (m)",
      wallThickness: "Devor qalinligi (m)",
    },
  },
  en: {
    login: {
      title: "Sign In",
      username: "Username",
      password: "Password",
      secretCode: "Secret Code",
      submit: "Sign In",
      error: "Invalid credentials",
    },
    dashboard: {
      start: "Start",
      upload: "Upload Image",
      uploadHint: "Upload a 2D floor plan image in JPG or PNG format",
      dragDrop: "Drop file here",
      orClick: "or click to browse",
      processing: "Processing...",
      detecting: "Detecting walls...",
      generating: "Generating 3D model...",
      exporting: "Preparing DXF file...",
      download: "Download DXF",
      newProject: "New Project",
      logout: "Logout",
      success: "DXF file ready!",
      error: "An error occurred",
      wallHeight: "Wall height (m)",
      wallThickness: "Wall thickness (m)",
    },
  },
  ru: {
    login: {
      title: "Вход в систему",
      username: "Имя пользователя",
      password: "Пароль",
      secretCode: "Секретный код",
      submit: "Войти",
      error: "Неверные данные",
    },
    dashboard: {
      start: "Начать",
      upload: "Загрузить изображение",
      uploadHint: "Загрузите 2D план этажа в формате JPG или PNG",
      dragDrop: "Перетащите файл сюда",
      orClick: "или нажмите для выбора",
      processing: "Обработка...",
      detecting: "Обнаружение стен...",
      generating: "Генерация 3D модели...",
      exporting: "Подготовка DXF файла...",
      download: "Скачать DXF",
      newProject: "Новый проект",
      logout: "Выйти",
      success: "DXF файл готов!",
      error: "Произошла ошибка",
      wallHeight: "Высота стен (м)",
      wallThickness: "Толщина стен (м)",
    },
  },
} as const;

export type TranslationKey = {
  login: {
    title: string;
    username: string;
    password: string;
    secretCode: string;
    submit: string;
    error: string;
  };
  dashboard: {
    start: string;
    upload: string;
    uploadHint: string;
    dragDrop: string;
    orClick: string;
    processing: string;
    detecting: string;
    generating: string;
    exporting: string;
    download: string;
    newProject: string;
    logout: string;
    success: string;
    error: string;
    wallHeight: string;
    wallThickness: string;
  };
};
