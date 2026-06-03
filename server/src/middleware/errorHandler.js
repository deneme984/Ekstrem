// Placeholder - will be implemented by Backend API Agent
export default function errorHandler(err, req, res, next) {
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
}
