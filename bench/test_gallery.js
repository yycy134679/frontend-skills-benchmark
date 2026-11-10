// 直接执行首页脚本，模拟存储限制、轨道尺寸变化和减弱动态效果。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function fixture(blocked) {
  const target = props => Object.assign({
    handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    dispatch(type) { this.handlers[type](); }
  }, props);
  const state = { reduced: false, scrolls: [] };
  const prev = target({}), next = target({}), picker = target({ value: 'original' });
  const note = { innerHTML: '生成说明' }, scoreNote = { hidden: false };
  const cards = Array.from({ length: 6 }, () => {
    const img = {};
    const shot = {
      href: 'examples/case-01/no-skill-claude-code/index.html',
      getAttribute() { return this.href; },
      querySelector() { return img; }
    };
    const nodes = { '.shot': shot, '.c-meta span': {}, '.c-score': null, '.c-note': {}, '.c-top': {} };
    return { querySelector(s) { return nodes[s]; }, getBoundingClientRect() { return { width: 400 }; } };
  });
  const section = { id: 'case-01', querySelector(s) { return s === '.score-note' ? scoreNote : note; } };
  const track = target({
    dataset: { track: 'case01' }, innerHTML: '原始卡片', scrollLeft: 0, scrollWidth: 2720, clientWidth: 920,
    closest() { return section; },
    querySelector(s) { return s === '.plate' ? cards[0] : cards[0].querySelector(s); },
    querySelectorAll() { return cards; },
    scrollBy(options) { state.scrolls.push(options); }
  });
  const stored = new Map([['model-case01', 'original']]);
  const storage = {
    getItem(key) {
      if (blocked === 'read' || blocked === 'both') throw Error('存储读取受限');
      return stored.get(key) ?? null;
    },
    setItem(key, value) {
      if (blocked === 'write' || blocked === 'both') throw Error('存储写入受限');
      stored.set(key, value);
    }
  };
  const window = target({
    scrollY: 0, scrollTo() {},
    matchMedia() { return { matches: state.reduced }; }
  });
  const context = {
    document: {
      querySelectorAll() { return [track]; },
      querySelector(s) { return s.startsWith('[data-model') ? picker : s.startsWith('[data-prev') ? prev : next; }
    },
    window, location: { hash: '' }, requestAnimationFrame(fn) { fn(); },
    getComputedStyle() { return { marginRight: '20px' }; }
  };
  Object.defineProperty(context, 'sessionStorage', {
    get() { if (blocked === 'getter') throw Error('存储不可访问'); return storage; }
  });
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, prev, next, picker, track, window, state, stored };
}

test('存储读取或访问被拒绝后仍可初始化、切换模型和保存本页状态', () => {
  for (const blocked of ['read', 'both', 'getter']) {
    const f = fixture(blocked);
    assert.equal(typeof f.next.handlers.click, 'function');
    f.picker.value = 'deepseek';
    f.picker.dispatch('change');
    assert.equal(vm.runInContext("load('model-case01')", f.context), 'deepseek');
    f.track.dispatch('scroll');
    f.window.dispatch('scroll');
  }
});

test('存储写入失败时内存状态优先于陈旧存储值', () => {
  const f = fixture('write');
  f.picker.value = 'deepseek';
  f.picker.dispatch('change');
  assert.equal(f.stored.get('model-case01'), 'original');
  assert.equal(vm.runInContext("load('model-case01')", f.context), 'deepseek');
});

test('窗口尺寸变化后重新启用仍有剩余内容的下一项按钮', () => {
  const f = fixture();
  f.track.scrollLeft = 1800;
  f.track.dispatch('scroll');
  assert.equal(f.next.disabled, true);
  f.track.clientWidth = 950;
  f.track.scrollWidth = 4636;
  f.window.dispatch('resize');
  assert.equal(f.next.disabled, false);
});

test('两个方向的箭头遵守当前减弱动态效果设置', () => {
  const f = fixture();
  f.next.dispatch('click');
  assert.equal(f.state.scrolls.at(-1).behavior, 'smooth');
  f.state.reduced = true;
  f.next.dispatch('click');
  assert.equal(f.state.scrolls.at(-1).behavior, 'auto');
  assert.equal(f.state.scrolls.at(-1).left, 420);
  f.prev.dispatch('click');
  assert.equal(f.state.scrolls.at(-1).behavior, 'auto');
  assert.equal(f.state.scrolls.at(-1).left, -420);
});
