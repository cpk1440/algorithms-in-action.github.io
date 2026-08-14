/* eslint-disable no-undef */

import SplayTree, { Node } from './splaytree';

function inOrder(root, keys = []) {
  if (root === null) return keys;

  inOrder(root.left, keys);
  keys.push(root.key);
  inOrder(root.right, keys);

  return keys;
}

function countNodes(root) {
  if (root === null) return 0;
  return 1 + countNodes(root.left) + countNodes(root.right);
}

describe('SplayTree rotations', () => {
  it('performs a right rotation without losing the middle subtree', () => {
    const root = new Node(30);
    root.left = new Node(20);
    root.left.right = new Node(25);

    const result = SplayTree.rightRotate(root);

    expect(result).toEqual({
      key: 20,
      left: null,
      right: {
        key: 30,
        left: {
          key: 25,
          left: null,
          right: null,
        },
        right: null,
      },
    });
  });

  it('performs a left rotation without losing the middle subtree', () => {
    const root = new Node(20);
    root.right = new Node(30);
    root.right.left = new Node(25);

    const result = SplayTree.leftRotate(root);

    expect(result).toEqual({
      key: 30,
      left: {
        key: 20,
        left: null,
        right: {
          key: 25,
          left: null,
          right: null,
        },
      },
      right: null,
    });
  });
});

describe('SplayTree.splay', () => {
  it('handles the left-left case', () => {
    const root = new Node(100);
    root.left = new Node(50);
    root.left.left = new Node(25);

    const result = SplayTree.splay(root, 25);

    expect(result.key).toBe(25);
    expect(inOrder(result)).toEqual([25, 50, 100]);
  });

  it('handles the left-right case', () => {
    const root = new Node(100);
    root.left = new Node(50);
    root.left.right = new Node(75);

    const result = SplayTree.splay(root, 75);

    expect(result.key).toBe(75);
    expect(inOrder(result)).toEqual([50, 75, 100]);
  });

  it('handles the right-right case', () => {
    const root = new Node(25);
    root.right = new Node(50);
    root.right.right = new Node(100);

    const result = SplayTree.splay(root, 100);

    expect(result.key).toBe(100);
    expect(inOrder(result)).toEqual([25, 50, 100]);
  });

  it('handles the right-left case', () => {
    const root = new Node(25);
    root.right = new Node(100);
    root.right.left = new Node(75);

    const result = SplayTree.splay(root, 75);

    expect(result.key).toBe(75);
    expect(inOrder(result)).toEqual([25, 75, 100]);
  });

  it('uses one right rotation when the target is the left child', () => {
    const root = new Node(100);
    root.left = new Node(50);
    root.left.right = new Node(75);

    const result = SplayTree.splay(root, 50);

    expect(result.key).toBe(50);
    expect(inOrder(result)).toEqual([50, 75, 100]);
  });

  it('uses one left rotation when the target is the right child', () => {
    const root = new Node(25);
    root.right = new Node(75);
    root.right.left = new Node(50);

    const result = SplayTree.splay(root, 75);

    expect(result.key).toBe(75);
    expect(inOrder(result)).toEqual([25, 50, 75]);
  });

  it('returns null for an empty tree', () => {
    expect(SplayTree.splay(null, 10)).toBeNull();
  });
});

describe('SplayTree.insert', () => {
  it('inserts into an empty tree', () => {
    const result = SplayTree.insert(null, 10);

    expect(result).toEqual({
      key: 10,
      left: null,
      right: null,
    });
  });

  it('makes every newly inserted key the root and preserves BST order', () => {
    const input = [40, 20, 60, 10, 30, 50, 70, 25];
    let root = null;
    const inserted = [];

    input.forEach((key) => {
      root = SplayTree.insert(root, key);
      inserted.push(key);

      expect(root.key).toBe(key);
      expect(inOrder(root)).toEqual([...inserted].sort((a, b) => a - b));
    });
  });

  it('ignores a duplicate without creating another node', () => {
    const input = [40, 20, 60, 10, 30, 50, 70];
    let root = input.reduce((tree, key) => SplayTree.insert(tree, key), null);
    const nodeCount = countNodes(root);

    root = SplayTree.insert(root, 40);

    expect(root.key).toBe(40);
    expect(countNodes(root)).toBe(nodeCount);
    expect(inOrder(root)).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });
});
