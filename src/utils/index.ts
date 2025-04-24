export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };

  keys.forEach((key) => {
    if (key in result) {
      delete result[key];
    }
  });

  return result;
};

export const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: K[]
): Pick<T, K> => {
  const result: Partial<T> = {};

  for (const key of keys) {
    if (key in object) {
      result[key] = object[key];
    }
  }

  return result as Pick<T, K>;
};
