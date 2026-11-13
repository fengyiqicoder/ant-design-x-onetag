import { describe, expect, it } from 'vitest';
import { pickKey } from '../src/key';

describe('pickKey', () => {
  it('uses the key built into the page when there is one', () => {
    expect(pickKey({ hostname: 'example.github.io', pageKey: 'ot_page', stored: 'ot_s', demoKey: 'ot_d' })).toBe('ot_page');
  });
  it('ignores the placeholder', () => {
    expect(pickKey({ hostname: 'example.github.io', pageKey: 'YOUR_ONETAG_KEY', stored: '', demoKey: 'ot_d' })).toBe('');
  });
  it('uses the demo key on localhost only', () => {
    expect(pickKey({ hostname: '127.0.0.1', pageKey: '', stored: '', demoKey: 'ot_d' })).toBe('ot_d');
    expect(pickKey({ hostname: 'localhost', pageKey: '', stored: '', demoKey: 'ot_d' })).toBe('ot_d');
    expect(pickKey({ hostname: 'example.com', pageKey: '', stored: '', demoKey: 'ot_d' })).toBe('');
  });
  it('uses a key the visitor pasted', () => {
    expect(pickKey({ hostname: 'example.com', pageKey: '', stored: 'ot_mine', demoKey: 'ot_d' })).toBe('ot_mine');
    expect(pickKey({ hostname: 'localhost', pageKey: '', stored: 'ot_mine', demoKey: 'ot_d' })).toBe('ot_mine');
  });
});
