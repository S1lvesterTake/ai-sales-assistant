module.exports = {
  'backend/**/*.ts': [
    () => 'npm --prefix backend run lint',
    () => 'npm --prefix backend run typecheck',
  ],
  'frontend/**/*.{ts,tsx}': [
    () => 'npm --prefix frontend run lint',
    () => 'npm --prefix frontend run typecheck',
  ],
};
