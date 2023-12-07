const firebase = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');

const firebaseSACert = require('../xaliss-agent-app-firebase-adminsdk-71a45-3b3ccdd427.json');

const notifImageURL =
  'https://firebasestorage.googleapis.com/v0/b/xaliss-agent-app.appspot.com/o/ic_launcher_android.png?alt=media&token=f9402d34-dcfd-40e9-9b90-a43d59e979b2';

const initializeFirebaseApp = () => {
  firebase.initializeApp({
    apiKey: 'AIzaSyDo5um3bhT5pl4ccbJ85yW85ul0uEA9Alo',
    authDomain: 'xaliss-agent-app.firebaseapp.com',
    projectId: 'xaliss-agent-app',
    storageBucket: 'xaliss-agent-app.appspot.com',
    messagingSenderId: '440555157997',
    appId: '1:440555157997:web:b3c1888300f79302350fe4',
    measurementId: 'G-B0MQF7ZBKX',
    credential: firebase.credential.cert(firebaseSACert),
  });
};

/**
 * Send Notification to device
 * @param {{}} data Data to send in notification
 * @param {string} deviceType Device type to send notification to
 * @param {string | null} token Device token
 * @param {string | null} topic Topic to send message to
 * @throws Error if both token and topic are null
 * @throws Error if device type is not android, ios or web
 */
const sendNotification = (
  data,
  deviceType,
  token = null,
  topic = null,
  title = '',
  body = ''
) => {
  const message = {
    data: data,
    notification: {
      title: title,
      body: body,
      imageUrl: notifImageURL,
    },
  };

  if (token !== null) message.token = token;
  else if (topic !== null) message.topic = topic;
  else throw new Error('must specify one: token or topic');

  // TODO: Add Device Specific Data
  if (deviceType.toLowerCase() === 'android') {
    message.android = {
      collapseKey: '',
      data: data,
      notification: {
        body: body,
        // bodyLocArgs: [''],
        // bodyLocKey: '',
        // channelId: '',
        // clickAction: '',
        // color: '#rrggbb',
        // defaultLightSettings: false,
        // defaultSound: false,
        // defaultVibrateTimings: false,
        // eventTimestamp: new Date(),
        // icon: '',
        imageUrl: notifImageURL,
        // lightSettings: {
        //   color: '#rrggbb',
        //   lightOffDurationMillis: 500,
        //   lightOnDurationMillis: 500,
        // },
        // localOnly: false,
        // notificationCount: 1,
        // priority: 'high',
        // sound: 'FILENAME_OF_SOUND_TO_BE_PLAYED',
        // sticky: false,
        // tag: '',
        // ticker: '',
        title: title,
        // titleLocArgs: [''],
        // titleLocKey: '',
        // vibrateTimingsMillis: [123, 123, 123],
        // visibility: 'public',
      },
      // priority: 'high',
    };
  } else if (deviceType.toLowerCase() === 'ios') {
    // message.apns = {
    //   payload: {
    //     aps: {
    //       threadId: '',
    //       sound: '',
    //       mutableContent: false,
    //       badge: 123,
    //       contentAvailable: false,
    //       category: '',
    //       alert: {
    //         title: '',
    //         body: '',
    //         subtitle: '',
    //         launchImage: '',
    //         titleLocArgs: [''],
    //         titleLocKey: '',
    //         locArgs: [''],
    //         locKey: '',
    //         subtitleLocArgs: [''],
    //         actionLocKey: '',
    //         subtitleLocKey: '',
    //       },
    //     },
    //   },
    //   fcmOptions: {
    //     imageUrl: '',
    //     analyticsLabel: '',
    //   },
    //   headers: {},
    // };
  } else if (deviceType.toLowerCase() === 'web') {
    // message.webpush = {
    //   data: {},
    //   fcmOptions: {
    //     link: '',
    //   },
    //   headers: {},
    //   notification: {
    //     actions: '',
    //     badge: '',
    //     body: '',
    //     data: {},
    //     dir: 'auto | ltr | rtl',
    //     icon: 'URL',
    //     image: 'URL',
    //     renotify: false,
    //     requireInteraction: false,
    //     silent: false,
    //     tag: '',
    //     vibrate: [1, 2, 3],
    //     title: '',
    //     timestamp: 123,
    //     lang: '',
    //   },
    // };
  } else {
    throw new Error(
      `Invalid deviceType: ${deviceType}, cannot send notification`
    );
  }

  return getMessaging().send(message);
};

module.exports = { initializeFirebaseApp, sendNotification };
