import { hello } from './index';

describe('hello', () => {
  it('greets the world by default', () => {
    expect(hello()).toBe('Hello world!');
  });
});
