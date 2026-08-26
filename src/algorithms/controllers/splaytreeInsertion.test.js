/* eslint-disable no-undef */

import SplayTreeInsertion from './splaytreeInsertion';
import { BSTColors as colors } from './BSTColors';

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

function createChunker(chunks = []) {
  return {
    add(bookmark, callback, args) {
      chunks.push({ bookmark: String(bookmark), callback, args });
    },
  };
}

function getInsertionSnapshots(chunks) {
  return chunks.filter(
    chunk => chunk.bookmark === 'Main'
      && chunk.args
      && Array.isArray(chunk.args[0]),
  );
}

function getInsertionBranchChunks(chunks) {
  return chunks.filter(
    chunk => chunk.bookmark === 'Main'
      && chunk.args
      && chunk.args[0]
      && chunk.args[0].type === 'insertion',
  );
}

describe('SplayTreeInsertion controller', () => {
  it('handles an empty input without registering animation chunks', () => {
    const chunks = [];

    const root = SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [] },
    );

    expect(root).toBeUndefined();
    expect(chunks).toEqual([]);
  });

  it('builds the final Splay tree through the shared insertion controller', () => {
    const input = [40, 20, 60, 10, 30, 50, 70, 25];

    const root = SplayTreeInsertion.run(createChunker(), { nodes: input });

    expect(root.key).toBe(25);
    expect(inOrder(root)).toEqual([10, 20, 25, 30, 40, 50, 60, 70]);
  });

  it('ignores duplicate values', () => {
    const chunks = [];
    const root = SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60, 40] },
    );

    expect(root.key).toBe(40);
    expect(countNodes(root)).toBe(3);
    expect(inOrder(root)).toEqual([20, 40, 60]);
    expect(getInsertionBranchChunks(chunks).pop().args[0]).toMatchObject({
      action: 'duplicate',
      key: 40,
      rootKey: 40,
    });
  });

  it('registers one independent snapshot after every insertion', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    expect(chunks.map(chunk => chunk.bookmark)).toEqual([
      'Main',
      'Main',
      'Main',
      'switchPath',
      'Main',
      'Main',
      'switchPath',
      'switchPath',
      'LL-rot1',
      'Main',
      'Main',
    ]);

    const insertionSnapshots = getInsertionSnapshots(chunks);

    expect(insertionSnapshots[0].args).toEqual([
      [40],
      [],
      40,
      40,
      {
        type: 'insertion',
        action: 'empty-tree',
        bookmark: 'Main',
        key: 40,
        rootKey: null,
      },
    ]);
    expect(insertionSnapshots[1].args).toEqual([
      [20, 40],
      [[20, 40]],
      20,
      20,
      {
        type: 'insertion',
        action: 'insert-left',
        bookmark: 'Main',
        key: 20,
        rootKey: 40,
      },
    ]);
    expect(insertionSnapshots[2].args).toEqual([
      [60, 40, 20],
      [[60, 40], [40, 20]],
      60,
      60,
      {
        type: 'insertion',
        action: 'insert-right',
        bookmark: 'Main',
        key: 60,
        rootKey: 40,
      },
    ]);
  });

  it('registers empty, left, and right insertion branch chunks', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    const branchChunks = getInsertionBranchChunks(chunks);

    expect(branchChunks.map(chunk => chunk.args[0])).toEqual([
      {
        type: 'insertion',
        action: 'empty-tree',
        bookmark: 'Main',
        key: 40,
        rootKey: null,
      },
      {
        type: 'insertion',
        action: 'insert-left',
        bookmark: 'Main',
        key: 20,
        rootKey: 40,
      },
      {
        type: 'insertion',
        action: 'insert-right',
        bookmark: 'Main',
        key: 60,
        rootKey: 40,
      },
    ]);

    const graph = {
      nodes: [{ id: 20 }, { id: 40 }],
      edges: [{ source: 40, target: 20 }],
      setEdgeColor: jest.fn(),
      setFunctionInsertText: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
    };
    const insertRightChunk = branchChunks[2];

    insertRightChunk.callback({ graph }, ...insertRightChunk.args);

    expect(graph.setNodeColor.mock.calls).toEqual([
      [20, undefined],
      [40, undefined],
      [40, colors.PATH_N],
    ]);
    expect(graph.setEdgeColor).toHaveBeenCalledWith(40, 20, undefined);
    expect(graph.setFunctionName).toHaveBeenCalledWith(
      'Insert 60 above and right of 40',
    );
  });

  it('registers the search path and rotation chunks for a splay search operation', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'insert', value: 60 },
          { type: 'search', value: 20 },
        ],
      },
    );

    expect(chunks.some(chunk => chunk.bookmark === 'switchPath')).toBe(true);
    expect(chunks.some(chunk => (
      chunk.bookmark === 'LE-rot1'
      || chunk.bookmark === 'LR-rot1'
      || chunk.bookmark === 'LL-rot1'
      || chunk.bookmark === 'RE-rot1'
    ))).toBe(true);
  });

  it('registers the BST search path before each Splay insertion', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    const traversalChunks = chunks.filter(
      chunk => chunk.bookmark === 'switchPath',
    );

    expect(traversalChunks.map(chunk => chunk.args)).toEqual([
      [40, null, 20],
      [20, null, 60],
      [40, 20, 60],
    ]);

    const graph = {
      setEdgeColor: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
    };
    const lastTraversalChunk = traversalChunks[2];

    lastTraversalChunk.callback(
      { graph },
      ...lastTraversalChunk.args,
    );

    expect(graph.setFunctionName).toHaveBeenCalledWith('Insert: 60');
    expect(graph.setEdgeColor).toHaveBeenCalledWith(
      20,
      40,
      colors.PATH_E,
    );
    expect(graph.setNodeColor.mock.calls).toEqual([
      [20, colors.PATH_N],
      [40, colors.PATH_N],
    ]);
  });

  it('replaces old edges when rendering the next snapshot', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    const graph = {
      edges: [{ source: 20, target: 40 }],
      addNode: jest.fn(),
      addEdge: jest.fn(),
      removeEdge: jest.fn(),
      directed: jest.fn(),
      layoutBST: jest.fn(),
      setFunctionInsertText: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
      setPauseLayout: jest.fn(),
    };
    const insertionSnapshots = getInsertionSnapshots(chunks);
    const thirdInsertionChunk = insertionSnapshots[2];

    thirdInsertionChunk.callback(
      { graph },
      ...thirdInsertionChunk.args,
    );

    expect(graph.removeEdge).toHaveBeenCalledWith(20, 40);
    expect(graph.addNode.mock.calls).toEqual([
      [60, 60],
      [40, 40],
      [20, 20],
    ]);
    expect(graph.addEdge.mock.calls).toEqual([
      [60, 40],
      [40, 20],
    ]);
    expect(graph.setNodeColor.mock.calls).toEqual([
      [60, undefined],
      [40, undefined],
      [20, undefined],
      [60, colors.NEW_N],
    ]);
    expect(graph.setPauseLayout.mock.calls).toEqual([[true], [false]]);
    expect(graph.directed).toHaveBeenCalledWith(false);
    expect(graph.layoutBST).toHaveBeenCalledWith(60, true);
    expect(graph.setFunctionName).toHaveBeenCalledWith('Inserted: 60');
  });

  it('turns a rotation event into a GraphTracer update', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    const rotationChunk = chunks.find(
      chunk => chunk.bookmark === 'LL-rot1',
    );

    expect(rotationChunk.args).toEqual([{
      type: 'rotation',
      direction: 'left',
      bookmark: 'LL-rot1',
      splayCase: 'RR',
      parentKey: null,
      pivotKey: 20,
      newRootKey: 40,
      transferredSubtreeKey: null,
    }]);

    const graph = {
      nodes: [{ id: 20 }, { id: 40 }],
      edges: [{ source: 20, target: 40 }],
      addEdge: jest.fn(),
      directed: jest.fn(),
      getRoot: jest.fn(() => 40),
      layoutBST: jest.fn(),
      removeEdge: jest.fn(),
      setEdgeColor: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
      setPauseLayout: jest.fn(),
    };

    rotationChunk.callback({ graph }, ...rotationChunk.args);

    expect(graph.removeEdge).toHaveBeenCalledWith(20, 40);
    expect(graph.addEdge).toHaveBeenCalledWith(40, 20);
    expect(graph.setNodeColor.mock.calls).toEqual([
      [20, undefined],
      [40, undefined],
      [20, colors.ROT_N],
      [40, colors.ROT_N],
    ]);
    expect(graph.setEdgeColor.mock.calls).toEqual([
      [20, 40, undefined],
      [40, 20, colors.ROT_E],
    ]);
    expect(graph.setPauseLayout.mock.calls).toEqual([[true], [false]]);
    expect(graph.layoutBST).toHaveBeenCalledWith(40, true);
    expect(graph.setFunctionName).toHaveBeenCalledWith('Left rotation: 20');
  });

  it('replays traversal, rotation, and snapshot chunks on a real GraphTracer', () => {
    const chunks = [];
    const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
    const graph = visualisers.graph.instance;

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    chunks.forEach(({ callback, args = [] }) => {
      callback({ graph }, ...args);
    });

    expect(graph.getRoot()).toBe(60);
    expect(graph.getTree()).toEqual({
      20: {},
      40: { left: 20 },
      60: { left: 40 },
    });
    expect(graph.findNode(60).color).toBe(colors.NEW_N);
    expect(graph.functionName).toBe('Inserted: 60');
  });

  it('replays a duplicate insertion without creating a node', () => {
    const chunks = [];
    const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
    const graph = visualisers.graph.instance;

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60, 40] },
    );

    chunks.forEach(({ callback, args = [] }) => {
      callback({ graph }, ...args);
    });

    expect(graph.nodes).toHaveLength(3);
    expect(graph.getRoot()).toBe(40);
    expect(graph.findNode(40).color).toBe(colors.FOUND_N);
    expect(graph.functionName).toBe('Duplicate ignored: 40');
  });

  it('replays zero and negative integer insertions on a real GraphTracer', () => {
    const chunks = [];
    const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
    const graph = visualisers.graph.instance;

    const root = SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [0, -10, 10, 5] },
    );

    chunks.forEach(({ callback, args = [] }) => {
      callback({ graph }, ...args);
    });

    expect(inOrder(root)).toEqual([-10, 0, 5, 10]);
    expect(graph.getRoot()).toBe(5);
    expect(graph.nodes.map(node => node.id).sort((a, b) => a - b)).toEqual([
      -10,
      0,
      5,
      10,
    ]);
  });

  describe('combined operations', () => {
    it('accepts insertion operations', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'insert', value: 60 },
        ],
      });

      expect(root.key).toBe(60);
      expect(inOrder(root)).toEqual([20, 40, 60]);
    });

    it('carries the root from insertion into search', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'insert', value: 60 },
          { type: 'search', value: 20 },
        ],
      });

      expect(root.key).toBe(20);
      expect(inOrder(root)).toEqual([20, 40, 60]);
    });

    it('inserts into the tree produced by the preceding search', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'insert', value: 60 },
          { type: 'search', value: 20 },
          { type: 'insert', value: 30 },
        ],
      });

      expect(root.key).toBe(30);
      expect(inOrder(root)).toEqual([20, 30, 40, 60]);
    });

    it('handles a search on an empty tree', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'search', value: 10 },
        ],
      });

      expect(root).toBeNull();
    });

    it('does not insert the target of a failed search', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 20 },
          { type: 'insert', value: 40 },
          { type: 'search', value: 30 },
        ],
      });

      expect(root.key).toBe(20);
      expect(inOrder(root)).toEqual([20, 40]);
    });

    it('ignores duplicate insertions', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 20 },
          { type: 'insert', value: 20 },
        ],
      });

      expect(root.key).toBe(20);
      expect(countNodes(root)).toBe(1);
    });

    it('carries state through multiple searches', () => {
      const root = SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'insert', value: 60 },
          { type: 'search', value: 20 },
          { type: 'search', value: 60 },
          { type: 'insert', value: 30 },
        ],
      });

      expect(root.key).toBe(30);
      expect(inOrder(root)).toEqual([20, 30, 40, 60]);
    });

    it('rejects unknown operations', () => {
      expect(() => SplayTreeInsertion.run(createChunker(), {
        operations: [
          { type: 'delete', value: 20 },
        ],
      })).toThrow('Unknown Splay Tree operation: delete');
    });
  });
});
