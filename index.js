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
const startSchedulers = require('./cronjob');
const { initializeFirebaseApp } = require('./services/firebase');

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
app.use('/api/health', healthRouter);

app.use('/images', express.static(path.join(__dirname, 'uploads')));

// Start the sendBonus scheduler
initializeFirebaseApp();
startSchedulers();

app.listen(PORT, () => {
  console.log(`🚀 Server ready at: http://localhost:${PORT}`);
});
