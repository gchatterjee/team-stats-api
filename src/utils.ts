export const withDelay = async <T>(
  fn: () => Promise<T>,
  delayMs: number,
): Promise<T> =>
  new Promise((resolve) => {
    setTimeout(async () => {
      const result = await fn();
      resolve(result);
    }, delayMs);
  });

export const promiseAllDelayed = async <T>(
  fns: (() => Promise<T>)[],
  delayIncrementMs: number,
): Promise<T[]> =>
  Promise.all(fns.map((fn, index) => withDelay(fn, index * delayIncrementMs)));
