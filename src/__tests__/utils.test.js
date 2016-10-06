/**
 *
 */
import { concat } from '../utils';


/**
 *
 */
describe('concat()', () => {
  it('concats strings', () => {
    const result = concat(['a', '/', undefined, 'b']);
    expect(result).toBe('a/b');
  });

  it('does not concat the separator following a non-string', () => {
    const result = concat(['a', '/', undefined, '/', 'b']);
    expect(result).toBe('a/b');
  });

  it('supports custom separator', () => {
    const result = concat(['a', '/', undefined, '#', 'b'], '#');
    expect(result).toBe('a/b');
  });
});
