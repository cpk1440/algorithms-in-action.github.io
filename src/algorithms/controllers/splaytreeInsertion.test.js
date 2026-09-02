/* eslint-disable no-undef */

import SplayTreeInsertion from './splaytreeInsertion';
import SplayTree from './splaytree';
import { BSTColors as colors } from './BSTColors';
import { initGlobalAlgorithmGetter } from './collapseChunkPlugin';
import {
  addSplayRotationChunks,
  getSplayRecursionFrames,
} from './InsertionSharedCode';

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

function makeNode(key, left = null, right = null) {
  return { key, left, right };
}

function cloneTree(root) {
  if (root === null) return null;
  return makeNode(root.key, cloneTree(root.left), cloneTree(root.right));
}

function flattenTree(root, tree = {}) {
  if (root === null) return tree;

  tree[root.key] = {};
  if (root.left !== null) tree[root.key].left = root.left.key;
  if (root.right !== null) tree[root.key].right = root.right.key;
  flattenTree(root.left, tree);
  flattenTree(root.right, tree);
  return tree;
}

function renderTree(graph, root) {
  if (root === null) return;

  graph.addNode(root.key, root.key);
  if (root.left !== null) {
    renderTree(graph, root.left);
    graph.addEdge(root.key, root.left.key);
  }
  if (root.right !== null) {
    renderTree(graph, root.right);
    graph.addEdge(root.key, root.right.key);
  }
  graph.layoutBST(root.key, true);
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
  afterEach(() => {
    initGlobalAlgorithmGetter(() => null);
  });

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
      'right-right',
      'leftRotate(t2)',
      't6 = right(t2)',
      't4 = left(t6)',
      't6.left = t2',
      't2.right = t4',
      'return t6',
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
      chunk.bookmark === 'leftRotate(t2)'
      || chunk.bookmark === 'rightRotate(t6)'
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
      setFunctionInsertText: jest.fn(),
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
      clearTID: jest.fn(),
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
    expect(graph.clearTID).toHaveBeenCalled();
    expect(graph.directed).toHaveBeenCalledWith(true);
    expect(graph.layoutBST).toHaveBeenCalledWith(60, true);
    expect(graph.setFunctionName).toHaveBeenCalledWith('Inserted: 60');
  });

  it('turns a rotation event into staged GraphTracer updates', () => {
    const chunks = [];

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [40, 20, 60] },
    );

    const rotationChunks = chunks.filter(
      chunk => chunk.args
        && chunk.args[0]
        && chunk.args[0].type === 'rotation',
    );

    const rotationEvent = {
      type: 'rotation',
      direction: 'left',
      bookmark: 'LL-rot1',
      splayCase: 'RR',
      parentKey: null,
      depth: 1,
      pivotKey: 20,
      newRootKey: 40,
      transferredSubtreeKey: null,
    };

    expect(rotationChunks.map(chunk => chunk.bookmark)).toEqual([
      'right-right',
      'leftRotate(t2)',
      't6 = right(t2)',
      't4 = left(t6)',
      't6.left = t2',
      't2.right = t4',
      'return t6',
    ]);
    expect(rotationChunks.slice(0, -1).map(chunk => chunk.args)).toEqual(
      Array(6).fill([rotationEvent]),
    );
    expect(rotationChunks[6].args).toEqual([rotationEvent, 40]);

    const graph = {
      nodes: [{ id: 20 }, { id: 40 }],
      edges: [{ source: 20, target: 40 }],
      addEdge: jest.fn(),
      clearTID: jest.fn(),
      directed: jest.fn(),
      getRoot: jest.fn(() => 40),
      layoutBST: jest.fn(),
      removeEdge: jest.fn(),
      setEdgeColor: jest.fn(),
      setFunctionInsertText: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
      setPauseLayout: jest.fn(),
      setTagInfo: jest.fn(),
      updateTID: jest.fn(),
    };

    rotationChunks.forEach(chunk => {
      chunk.callback({ graph }, ...chunk.args);
    });

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
      [20, 40, colors.ROT_E],
      [40, 20, colors.ROT_E],
    ]);
    expect(graph.setPauseLayout.mock.calls).toEqual([[true], [false]]);
    expect(graph.clearTID).toHaveBeenCalledTimes(1);
    expect(graph.directed).toHaveBeenCalledWith(true);
    expect(graph.layoutBST).toHaveBeenCalledWith(40, true);
    expect(graph.getRoot).not.toHaveBeenCalled();
    expect(graph.updateTID.mock.calls).toEqual([
      [20, 't2'],
      [40, 't6'],
    ]);
    expect(graph.setFunctionName).toHaveBeenCalledWith('Left rotation: 20');
    expect(graph.setFunctionInsertText).toHaveBeenLastCalledWith(
      ' splayCase: Zig (RR)',
    );
  });

  it('tracks the rendered root during the 30,10,20 Zig/RL rotation', () => {
    const chunks = [];
    const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
    const graph = visualisers.graph.instance;

    SplayTreeInsertion.run(
      createChunker(chunks),
      { nodes: [30, 10, 20] },
    );

    const rotationChunks = chunks.filter(
      chunk => chunk.args
        && chunk.args[0]
        && chunk.args[0].type === 'rotation'
        && chunk.args[0].pivotKey === 10,
    );

    expect(rotationChunks.map(chunk => chunk.bookmark)).toEqual([
      'right-left',
      'leftRotate(t2)',
      't6 = right(t2)',
      't4 = left(t6)',
      't6.left = t2',
      't2.right = t4',
      'return t6',
    ]);
    expect(rotationChunks.map(chunk => chunk.bookmark)).not.toContain(
      'LR-rot2',
    );

    const returnChunkIndex = chunks.indexOf(rotationChunks[6]);
    chunks.slice(0, returnChunkIndex + 1).forEach(({ callback, args = [] }) => {
      callback({ graph }, ...args);
    });

    expect(graph.getRoot()).toBe(30);
    expect(graph.root).toBe(30);
    expect(graph.getTree()).toEqual({
      10: {},
      30: { left: 10 },
    });
  });

  it.each([
    {
      name: 'LL',
      key: 25,
      caseBookmark: 'left-left',
      rotationBookmarks: ['rightRotate(t6)', 'rightRotate(t6)'],
      buildTree: () => makeNode(
        100,
        makeNode(
          50,
          makeNode(25, null, makeNode(40)),
          makeNode(75),
        ),
      ),
    },
    {
      name: 'LR',
      key: 75,
      caseBookmark: 'left-right',
      rotationBookmarks: ['leftRotate(t2)', 'rightRotate(t6)'],
      buildTree: () => makeNode(
        100,
        makeNode(
          50,
          null,
          makeNode(75, makeNode(60), makeNode(90)),
        ),
      ),
    },
    {
      name: 'RR',
      key: 100,
      caseBookmark: 'right-right',
      rotationBookmarks: ['leftRotate(t2)', 'leftRotate(t2)'],
      buildTree: () => makeNode(
        25,
        null,
        makeNode(
          75,
          makeNode(50),
          makeNode(100, makeNode(90)),
        ),
      ),
    },
    {
      name: 'RL',
      key: 75,
      caseBookmark: 'right-left',
      rotationBookmarks: ['rightRotate(t6)', 'leftRotate(t2)'],
      buildTree: () => makeNode(
        25,
        null,
        makeNode(
          100,
          makeNode(75, makeNode(60), makeNode(90)),
        ),
      ),
    },
  ])(
    'replays the $name double rotation with non-empty t4 subtrees',
    ({
      key,
      caseBookmark,
      rotationBookmarks,
      buildTree,
    }) => {
      const initialRoot = buildTree();
      const algorithmEvents = [];
      const result = SplayTree.splay(
        cloneTree(initialRoot),
        key,
        event => algorithmEvents.push(event),
      );
      const rotationEvents = algorithmEvents.filter(
        event => event.type === 'rotation',
      );
      const chunks = [];
      const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
      const graph = visualisers.graph.instance;

      renderTree(graph, initialRoot);
      addSplayRotationChunks(
        createChunker(chunks),
        algorithmEvents,
        'search',
        initialRoot.key,
      );

      expect(rotationEvents).toHaveLength(2);
      expect(rotationEvents.every(
        event => event.transferredSubtreeKey !== null,
      )).toBe(true);
      expect(chunks.filter(
        chunk => chunk.bookmark === caseBookmark,
      )).toHaveLength(1);
      expect(chunks.filter(chunk => (
        chunk.bookmark === 'leftRotate(t2)'
        || chunk.bookmark === 'rightRotate(t6)'
      )).map(chunk => chunk.bookmark)).toEqual(rotationBookmarks);

      chunks.forEach(({ callback, args = [] }) => {
        callback({ graph }, ...args);
      });

      expect(graph.getRoot()).toBe(result.key);
      expect(graph.getTree()).toEqual(flattenTree(result));
      expect(graph.isDirected).toBe(true);
    },
  );

  it('shows depth boxes and the Splay case only when recursion is expanded', () => {
    const expandedAlgorithm = {
      id: { name: 'splaytree' },
      collapse: {
        splaytree: {
          operations: {
            insert_splay: true,
            search_splay: true,
          },
        },
      },
    };
    initGlobalAlgorithmGetter(() => expandedAlgorithm);

    const chunks = [];
    SplayTreeInsertion.run(createChunker(chunks), { nodes: [40, 20, 40] });
    const traversalChunk = chunks.find(
      chunk => chunk.bookmark === 'switchPath'
        && chunk.args[0] === 20
        && chunk.args[2] === 40,
    );
    const graph = {
      pushRectStack: jest.fn(),
      rectangle_size: jest.fn(),
      setEdgeColor: jest.fn(),
      setFunctionInsertText: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
    };

    traversalChunk.callback({ graph }, ...traversalChunk.args);

    expect(graph.pushRectStack).toHaveBeenCalledWith([20, 40], 'Depth 1');
    expect(graph.rectangle_size).toHaveBeenCalled();
    expect(graph.setFunctionInsertText).toHaveBeenCalledWith(
      ' splayCase: Zig (RE)',
    );

    expandedAlgorithm.collapse.splaytree.operations.insert_splay = false;
    graph.pushRectStack.mockClear();
    graph.setFunctionInsertText.mockClear();
    traversalChunk.callback({ graph }, ...traversalChunk.args);

    expect(graph.pushRectStack).not.toHaveBeenCalled();
    expect(graph.setFunctionInsertText).not.toHaveBeenCalled();
  });

  it('shows depth boxes for Splay search when search recursion is expanded', () => {
    const expandedAlgorithm = {
      id: { name: 'splaytree' },
      collapse: {
        splaytree: {
          operations: {
            insert_splay: false,
            search_splay: true,
          },
        },
      },
    };
    initGlobalAlgorithmGetter(() => expandedAlgorithm);

    const chunks = [];
    SplayTreeInsertion.run(
      createChunker(chunks),
      {
        operations: [
          { type: 'insert', value: 40 },
          { type: 'insert', value: 20 },
          { type: 'search', value: 40 },
        ],
      },
    );
    const traversalChunk = chunks.find(
      chunk => chunk.bookmark === 'switchPath'
        && chunk.args[0] === 20
        && chunk.args[2] === 40,
    );
    const graph = {
      pushRectStack: jest.fn(),
      rectangle_size: jest.fn(),
      setEdgeColor: jest.fn(),
      setFunctionInsertText: jest.fn(),
      setFunctionName: jest.fn(),
      setNodeColor: jest.fn(),
    };

    traversalChunk.callback({ graph }, ...traversalChunk.args);

    expect(graph.pushRectStack).toHaveBeenCalledWith([20, 40], 'Depth 1');
    expect(graph.rectangle_size).toHaveBeenCalled();
    expect(graph.setFunctionInsertText).toHaveBeenCalledWith(
      ' splayCase: Zig (RE)',
    );

    expandedAlgorithm.collapse.splaytree.operations.search_splay = false;
    graph.pushRectStack.mockClear();
    graph.setFunctionInsertText.mockClear();
    traversalChunk.callback({ graph }, ...traversalChunk.args);

    expect(graph.pushRectStack).not.toHaveBeenCalled();
    expect(graph.setFunctionInsertText).not.toHaveBeenCalled();
  });

  it('describes nested Splay calls two tree levels at a time', () => {
    const root = {
      key: 100,
      left: {
        key: 50,
        left: {
          key: 25,
          left: { key: 10, left: null, right: null },
          right: null,
        },
        right: null,
      },
      right: null,
    };

    expect(getSplayRecursionFrames(root, 10)).toEqual([
      {
        depth: 1,
        nodeKeys: [100, 50, 25, 10],
        recursionBlock: null,
        rootKey: 100,
        splayCase: 'LL',
      },
      {
        depth: 2,
        nodeKeys: [25, 10],
        recursionBlock: 'LL-recurse',
        rootKey: 25,
        splayCase: 'LE',
      },
    ]);
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
    expect(graph.isDirected).toBe(true);
    expect(graph.nodes.every(node => node.height === undefined)).toBe(true);
  });

  it('clears temporary rotation roles without removing numeric heights', () => {
    const visualisers = SplayTreeInsertion.initVisualisers({ visualiser: {} });
    const graph = visualisers.graph.instance;

    graph.addNode(10, 10);
    graph.addNode(20, 20);
    graph.updateHeight(10, 2);
    graph.updateTID(20, 't2');

    graph.clearTID();

    expect(graph.findNode(10).height).toBe(2);
    expect(graph.findNode(20).height).toBeUndefined();
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

    it('animates a search after inserting 2, 10, and 34', () => {
      const chunks = [];

      SplayTreeInsertion.run(createChunker(chunks), {
        operations: [
          { type: 'insert', value: 2 },
          { type: 'insert', value: 10 },
          { type: 'insert', value: 34 },
          { type: 'search', value: 2 },
        ],
      });

      const firstSearchChunk = chunks.findIndex(
        chunk => chunk.bookmark === 'switchPath'
          && chunk.args[2] === 2,
      );
      const searchChunks = chunks.slice(firstSearchChunk);

      expect(searchChunks.filter(chunk => chunk.bookmark === 'switchPath'))
        .toHaveLength(3);
      expect(searchChunks.map(chunk => chunk.bookmark)).toEqual([
        'switchPath',
        'switchPath',
        'switchPath',
        'left-left',
        'rightRotate(t6)',
        't2 = left(t6)',
        't4 = right(t2)',
        't2.right = t6',
        't6.left = t4',
        'return t2',
        'rightRotate(t6)',
        't2 = left(t6)',
        't4 = right(t2)',
        't2.right = t6',
        't6.left = t4',
        'return t2',
        '1',
      ]);
      const finalSearchChunk = searchChunks[searchChunks.length - 1];
      expect(finalSearchChunk.args[2]).toBe(2);
      expect(finalSearchChunk.args[0]).toEqual([2, 10, 34]);
      expect(finalSearchChunk.args[1]).toEqual([
        [2, 10],
        [10, 34],
      ]);
      expect(finalSearchChunk.args[3]).toBe(2);
      expect(finalSearchChunk.args[4]).toBe(true);
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
