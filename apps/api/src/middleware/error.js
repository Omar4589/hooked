// Last two middlewares on the app: an unmatched route and a thrown/forwarded error both
// answer JSON, never Express's HTML page.

export const notFound = (req, res) => {
  res.status(404).json({ error: 'Not found' });
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Headers already sent: nothing sensible can be written; hand off to Express's default.
  if (res.headersSent) return next(err);
  const status = Number(err.status || err.statusCode) || 500;
  if (status >= 500) console.error('[hooked-api]', err);
  res
    .status(status)
    .json({ error: status >= 500 ? 'Server error' : err.message || 'Request failed' });
};
