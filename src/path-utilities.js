export function createTimer() {
  const startTime = Date.now();
  return {
    elapsed: () => Date.now() - startTime
  };
}
