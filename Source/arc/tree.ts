import { TreeNode } from 'primereact/treenode';

export function findNodeByKey(nodes: TreeNode[], key: string): TreeNode | undefined {
    for (const node of nodes) {
        if (node.key === key) {
            return node;
        }

        const found = findNodeByKey(node.children ?? [], key);
        if (found) {
            return found;
        }
    }

    return undefined;
}
