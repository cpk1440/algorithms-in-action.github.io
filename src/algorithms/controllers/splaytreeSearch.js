/**
 * Splay Tree Search controller.
 *
 * This controller uses the pure `SplayTree` data-structure (no visual code)
 * to perform a splay on the accessed key and then updates the visualiser
 * to reflect the new tree (accessed node moved to root).
 */

import SplayTree from './splaytree';

export default {
    /**
         * For the search algorithm, we use the tree that is created in
         * the insertion algorithm to initialise the visualiser
         * @param {object} visualiser
         */
    initVisualisers({ visualiser }) {
        // clear existing trace, if any
        visualiser.graph.instance.clear();
        return {
            graph: {
                instance: visualiser.graph.instance,
                order: 0,
            },
        };
    },

    /**
     * We use the tree that is created in the insertion algorithm to search
     * @param {object} chunker
     * @param {object} visualiser
     * @param {number} target
     */
    run(chunker, { visualiser, target }) {
        // get whole (flat) tree and root id from the visualiser
        const flatTree = visualiser.graph.instance.getTree();
        const rootId = visualiser.graph.instance.getRoot();

        // helper: build a nested SplayTree Node structure from the flat tree
        function buildNested(id) {
            if (id === undefined || id === null) return null;
            const node = SplayTree.newNode(id);
            const entry = flatTree[id] || {};
            if (entry.left) node.left = buildNested(entry.left);
            if (entry.right) node.right = buildNested(entry.right);
            return node;
        }

        const nestedRoot = buildNested(rootId);

        chunker.add('Splay_Search(t, k)', (vis) => {
            vis.graph.setZoom(0.55);
            vis.graph.popAllRectStack();
            vis.graph.setFunctionInsertText(`(t, ${target})`);
            vis.graph.setFunctionName('Splay_Search');
        }, [rootId]);

        // perform the splay (this moves the accessed node, or the last accessed
        // node while searching, to the root)
        const newRoot = SplayTree.search(nestedRoot, target);

        // convert nested tree back into flat edges on the visualiser
        const g = visualiser.graph.instance;
        // remove all existing edges
        const oldEdges = g.edges ? [...g.edges] : [];
        oldEdges.forEach(e => g.removeEdge(e.source, e.target));

        // traverse nested tree and add edges
        function addEdges(node) {
            if (!node) return;
            if (node.left) {
                g.addEdge(node.key, node.left.key);
                addEdges(node.left);
            }
            if (node.right) {
                g.addEdge(node.key, node.right.key);
                addEdges(node.right);
            }
        }
        if (newRoot) addEdges(newRoot);

        // layout the tree with the new root
        if (newRoot) {
            g.layoutTree(newRoot.key);
            g.directed(false);
            g.layout();
        }

        // set message and return status based on whether target reached root
        if (newRoot && newRoot.key === target) {
            chunker.add('return t', (vis) => vis.graph.setText('Key found'));
            return 'success';
        }

        chunker.add('return NotFound', (vis) => vis.graph.setText('Key not found'));
        return 'fail';
    },
};

