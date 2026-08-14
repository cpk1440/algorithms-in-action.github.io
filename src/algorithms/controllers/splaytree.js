// Play tree implementation
// (XXX should add deletion?)
// Needs extra augmentation to make it into an AIA controller for
// animation (best merge AVL tree controller with this code as we want
// animations to be similar)

// The code is contributed by Nidhi goel to Geeks for Geeks
// Modified by Lee Naish

// Javascript code addition 

/**
 * Pure Splay Tree data structure used by the AIA controllers.
 *
 * This module deliberately contains no visualisation code. Controllers can
 * build animation chunks around these operations while the data-structure
 * behaviour remains independently testable.
 */

export class Node {
  constructor(key) {
    this.key = key;
    this.left = null;
    this.right = null;
  }
}

class SplayTree {
  static newNode(key) {
    return new Node(key);
  }

  static rightRotate(root) {
    const newRoot = root.left;
    root.left = newRoot.right;
    newRoot.right = root;
    return newRoot;
  }

  static leftRotate(root) {
    const newRoot = root.right;
    root.right = newRoot.left;
    newRoot.left = root;
    return newRoot;
  }

  /**
   * Move the requested key, or the last node reached while looking for it,
   * to the root of the tree.
   *
   * The recursive structure follows the existing AIA pseudocode: it examines
   * two levels at a time and performs rotations as recursive calls return.
   */
  static splay(root, key) {
    if (root === null || root.key === key) {
      return root;
    }

    if (key < root.key) {
      if (root.left === null) {
        return root;
      }

      if (key < root.left.key) {
        // Left-left: first splay inside the left-left subtree.
        root.left.left = SplayTree.splay(root.left.left, key);
        root = SplayTree.rightRotate(root);
      } else if (key > root.left.key) {
        // Left-right: first splay inside the left-right subtree.
        root.left.right = SplayTree.splay(root.left.right, key);
        if (root.left.right !== null) {
          root.left = SplayTree.leftRotate(root.left);
        }
      }

      // This is also the single-rotation case when the key is the left child.
      return root.left === null ? root : SplayTree.rightRotate(root);
    }

    if (root.right === null) {
      return root;
    }

    if (key > root.right.key) {
      // Right-right: first splay inside the right-right subtree.
      root.right.right = SplayTree.splay(root.right.right, key);
      root = SplayTree.leftRotate(root);
    } else if (key < root.right.key) {
      // Right-left: first splay inside the right-left subtree.
      root.right.left = SplayTree.splay(root.right.left, key);
      if (root.right.left !== null) {
        root.right = SplayTree.rightRotate(root.right);
      }
    }

    // This is also the single-rotation case when the key is the right child.
    return root.right === null ? root : SplayTree.leftRotate(root);
  }

  static search(root, key) {
    return SplayTree.splay(root, key);
  }

  static insert(root, key) {
    if (root === null) {
      return SplayTree.newNode(key);
    }

    const splayedRoot = SplayTree.splay(root, key);

    // Duplicate keys are ignored. Splaying still moves the existing node to
    // the root, which is the expected Splay Tree access behaviour.
    if (splayedRoot.key === key) {
      return splayedRoot;
    }

    const newRoot = SplayTree.newNode(key);

    if (key < splayedRoot.key) {
      newRoot.left = splayedRoot.left;
      newRoot.right = splayedRoot;
      splayedRoot.left = null;
    } else {
      newRoot.left = splayedRoot;
      newRoot.right = splayedRoot.right;
      splayedRoot.right = null;
    }

    return newRoot;
  }
}

export default SplayTree;
