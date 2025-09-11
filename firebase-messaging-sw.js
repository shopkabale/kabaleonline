importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

const firebaseConfig = {
    apiKey: "AIzaSyBLf0fZUFGXS9NMS3rMr8Iisy-siAAiIyI",
    authDomain: "kabale-20ec4.firebaseapp.com",
    projectId: "kabale-20ec4",
    storageBucket: "kabale-20ec4.firebasestorage.app",
    messagingSenderId: "792218710477",
    appId: "1:792218710477:web:5a32cc3177ddba98ff5484",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/192.png'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});
