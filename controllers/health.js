const prisma = require('../services/prisma');

async function handleHealthCheck(_, res) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({ message: 'OK' });
  } catch (err) {
    return res.status(500).json({ message: 'Error: ' + err });
  }
}

module.exports = { handleHealthCheck };
