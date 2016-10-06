/**
 *
 */
export const concat = (strings, separator = '/') => strings.reduce((result, string, index) => {
  const previousString = strings[index - 1];

  if ((string && string !== separator) || (previousString && string === separator)) {
    return result + string;
  }

  return result;
}, '');
