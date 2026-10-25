/* eslint-env jest */
import { parseTreeInput, treeInputTokens, legacyTreeInput } from './treeInput';

test('parses inserts and searches including zero, negatives and whitespace', () => {
  expect(parseTreeInput(' 4, ?4, 0, -2, ?-2 ')).toEqual([
    { type: 'insert', value: 4 }, { type: 'search', value: 4 },
    { type: 'insert', value: 0 }, { type: 'insert', value: -2 },
    { type: 'search', value: -2 },
  ]);
  expect(treeInputTokens([' 4 ', ' ?-2 '])).toEqual(['4', '?-2']);
});

test.each(['', '1,', ',1', '1,,2', '?', '?1.2', 'a', '--1', '1e2', '9007199254740992'])(
  'rejects invalid input %s', input => expect(() => parseTreeInput(input)).toThrow('Invalid input'),
);

test('translates legacy links without mutating lists or adding searches to operations links', () => {
  const list = [1, 2];
  expect(legacyTreeInput(list, 'search', '0')).toEqual([1, 2, '?0']);
  expect(list).toEqual([1, 2]);
  expect(legacyTreeInput('1,2', 'insertion', '4')).toEqual(['1', '2']);
  expect(legacyTreeInput('1,?2', 'operations', '4')).toEqual(['1', '?2']);
  expect(legacyTreeInput('', 'search', '-3')).toEqual(['?-3']);
  expect(() => parseTreeInput(legacyTreeInput('1,,2', 'operations', ''))).toThrow('Invalid input');
});
