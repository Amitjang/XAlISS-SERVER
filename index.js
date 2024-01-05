const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const morgan = require('morgan');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const agentRouter = require('./routes/agent');
const userRouter = require('./routes/user');
const paymentRouter = require('./routes/payment');
const healthRouter = require('./routes/health');
const notificationRouter = require('./routes/notification');

const startSchedulers = require('./cronjob');
const { notifications } = require('./notifications');

const { initializeFirebaseApp } = require('./services/firebase');

const { sendSMS } = require('./utils/sendSMS');
const { getNotificationText } = require('./utils/getNotificationText');

dotenv.config();
const app = express();

const PORT = process.env.PORT;
if (!PORT || PORT.length === 0) {
  throw new Error("Must set 'PORT' environment variable");
}
const nodeEnv = process.env.NODE_ENV;

if (nodeEnv === 'dev') {
  app.use(morgan('short'));
}

// Middlewares
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/agents', agentRouter);
app.use('/api/users', userRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/health', healthRouter);

app.use('/images', express.static(path.join(__dirname, 'uploads')));

// Start the sendBonus scheduler
initializeFirebaseApp();
startSchedulers();

(async () => {
  // try {
  const res = await sendSMS(
    '',
    '27665773560',
    getNotificationText(notifications['en'].send_money, {
      agent_full_name: 'Agent X',
      customer_last_name: 'Customer Y',
      agent_phone_number: '+1 (123) 456-789',

      amount: '[[[150 rupya dega]]]',
      sender_phone_number: '[[[ye mera samsoong ka number hai]]]',
      balance: '[[[taalis lakh]]]',
      transfer_purpose: '[[[aise hi, sexy lag raha tha]]]',
    })
  );

  console.log(res);

  // const json = await res.json();
  // console.log(json);
  // } catch (error) {
  //   console.error('Error encountered');
  //   console.error(error);
  // }
})();

// console.log(
//   getNotificationText(notifications['fr'].send_money, {
//     amount: '[[[150 rupya dega]]]',
//     sender_phone_number: '[[[ye mera samsoong ka number hai]]]',
//     balance: '[[[taalis lakh]]]',
//     transfer_purpose: '[[[aise hi, sexy lag raha tha]]]',
//   })
// );

app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
