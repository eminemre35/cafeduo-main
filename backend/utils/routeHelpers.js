const executeDataMode = async (isDbConnected, handlers) => {
  const isConnected = await isDbConnected();
  if (isConnected) {
    return handlers.db();
  }
  return handlers.memory();
};

const sendApiError = (res, logger, context, err, message, status = 500) => {
  if (logger && typeof logger.error === 'function') {
    logger.error(`${context}:`, err);
  } else {
    console.error(`${context}:`, err);
  }
  return res.status(status).json({ error: message });
};

module.exports = {
  executeDataMode,
  sendApiError,
};

