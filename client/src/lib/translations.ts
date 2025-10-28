// Translation system for chatbot widget UI elements

export interface Translations {
  // Pre-chat form
  welcomeTo: string;
  provideDetails: string;
  yourName: string;
  yourPhone: string;
  startChat: string;
  starting: string;
  
  // Chat interface
  typeMessage: string;
  leaveMessage: string;
  send: string;
  poweredBy: string;
  weAreOnline: string;
  currentlyOffline: string;
  quickQuestions: string;
  
  // Lead capture
  shareContact: string;
  submit: string;
  skip: string;
  thankYou: string;
  
  // Common
  close: string;
  minimize: string;
  expand: string;
}

export const translations: Record<string, Translations> = {
  en: {
    welcomeTo: "Welcome to",
    provideDetails: "Please provide your details to start chatting",
    yourName: "Your name",
    yourPhone: "Your phone number",
    startChat: "Start Chat",
    starting: "Starting...",
    typeMessage: "Type your message...",
    leaveMessage: "Leave us a message...",
    send: "Send",
    poweredBy: "Powered by",
    weAreOnline: "We're online - How can we help?",
    currentlyOffline: "Currently offline - Leave us a message",
    quickQuestions: "Quick questions to get started:",
    shareContact: "To help serve you better, would you mind sharing your contact information?",
    submit: "Submit",
    skip: "Skip",
    thankYou: "Thank you for sharing your information! How can I help you today?",
    close: "Close",
    minimize: "Minimize",
    expand: "Expand",
  },
  ar: {
    welcomeTo: "مرحبا بك في",
    provideDetails: "يرجى تقديم بياناتك لبدء المحادثة",
    yourName: "اسمك",
    yourPhone: "رقم هاتفك",
    startChat: "ابدأ المحادثة",
    starting: "جاري البدء...",
    typeMessage: "اكتب رسالتك...",
    leaveMessage: "اترك لنا رسالة...",
    send: "إرسال",
    poweredBy: "مدعوم من",
    weAreOnline: "نحن متصلون - كيف يمكننا المساعدة؟",
    currentlyOffline: "غير متصل حاليًا - اترك لنا رسالة",
    quickQuestions: "أسئلة سريعة للبدء:",
    shareContact: "لخدمتك بشكل أفضل، هل تمانع في مشاركة معلومات الاتصال الخاصة بك؟",
    submit: "إرسال",
    skip: "تخطي",
    thankYou: "شكرا لمشاركة معلوماتك! كيف يمكنني مساعدتك اليوم؟",
    close: "إغلاق",
    minimize: "تصغير",
    expand: "توسيع",
  },
  fr: {
    welcomeTo: "Bienvenue à",
    provideDetails: "Veuillez fournir vos coordonnées pour commencer à discuter",
    yourName: "Votre nom",
    yourPhone: "Votre numéro de téléphone",
    startChat: "Démarrer le chat",
    starting: "Démarrage...",
    typeMessage: "Tapez votre message...",
    leaveMessage: "Laissez-nous un message...",
    send: "Envoyer",
    poweredBy: "Propulsé par",
    weAreOnline: "Nous sommes en ligne - Comment pouvons-nous vous aider?",
    currentlyOffline: "Actuellement hors ligne - Laissez-nous un message",
    quickQuestions: "Questions rapides pour commencer:",
    shareContact: "Pour mieux vous servir, pourriez-vous partager vos coordonnées?",
    submit: "Soumettre",
    skip: "Passer",
    thankYou: "Merci d'avoir partagé vos informations! Comment puis-je vous aider aujourd'hui?",
    close: "Fermer",
    minimize: "Réduire",
    expand: "Agrandir",
  },
  es: {
    welcomeTo: "Bienvenido a",
    provideDetails: "Por favor proporcione sus datos para comenzar a chatear",
    yourName: "Su nombre",
    yourPhone: "Su número de teléfono",
    startChat: "Iniciar chat",
    starting: "Iniciando...",
    typeMessage: "Escribe tu mensaje...",
    leaveMessage: "Déjanos un mensaje...",
    send: "Enviar",
    poweredBy: "Desarrollado por",
    weAreOnline: "Estamos en línea - ¿Cómo podemos ayudar?",
    currentlyOffline: "Actualmente desconectado - Déjanos un mensaje",
    quickQuestions: "Preguntas rápidas para empezar:",
    shareContact: "Para servirle mejor, ¿le importaría compartir su información de contacto?",
    submit: "Enviar",
    skip: "Omitir",
    thankYou: "¡Gracias por compartir tu información! ¿Cómo puedo ayudarte hoy?",
    close: "Cerrar",
    minimize: "Minimizar",
    expand: "Expandir",
  },
  de: {
    welcomeTo: "Willkommen bei",
    provideDetails: "Bitte geben Sie Ihre Daten ein, um mit dem Chatten zu beginnen",
    yourName: "Ihr Name",
    yourPhone: "Ihre Telefonnummer",
    startChat: "Chat starten",
    starting: "Wird gestartet...",
    typeMessage: "Geben Sie Ihre Nachricht ein...",
    leaveMessage: "Hinterlassen Sie uns eine Nachricht...",
    send: "Senden",
    poweredBy: "Betrieben von",
    weAreOnline: "Wir sind online - Wie können wir helfen?",
    currentlyOffline: "Derzeit offline - Hinterlassen Sie uns eine Nachricht",
    quickQuestions: "Schnelle Fragen zum Einstieg:",
    shareContact: "Um Ihnen besser zu dienen, würden Sie Ihre Kontaktinformationen teilen?",
    submit: "Einreichen",
    skip: "Überspringen",
    thankYou: "Vielen Dank für das Teilen Ihrer Informationen! Wie kann ich Ihnen heute helfen?",
    close: "Schließen",
    minimize: "Minimieren",
    expand: "Erweitern",
  },
};

export function getTranslations(languageCode: string): Translations {
  return translations[languageCode] || translations.en;
}
