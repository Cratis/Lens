import { beforeEach, describe, it } from 'vitest';
import { TreeNode } from 'primereact/treenode';
import { buildNamespaceTree, IntrospectionMetadataBase } from '../introspection';

function item(namespace: string, name: string): IntrospectionMetadataBase {
    return { name, namespace, route: `/${name}`, type: `${namespace}.${name}`, documentationSummary: '' };
}

describe('when building a namespace tree', () => {
    let roots: TreeNode[];

    beforeEach(() => {
        roots = buildNamespaceTree([
            item('Acme.Sales', 'Create'),
            item('Acme.Sales', 'Update'),
            item('Acme.Billing', 'Pay'),
            item('Other', 'Ping'),
            item('', 'Loose'),
            item('..', 'AlsoLoose'),
        ], 'pi pi-bolt');
    });

    it('should create one root per top level namespace and one per rootless item', () => {
        roots.map(_ => _.key).should.deep.equal(['ns:Acme', 'ns:Other', 'leaf:.Loose', 'leaf:...AlsoLoose']);
    });

    it('should nest namespaces once each', () => {
        roots[0].children!.map(_ => _.key).should.deep.equal(['ns:Acme.Sales', 'ns:Acme.Billing']);
    });

    it('should describe namespace nodes as unselectable folders', () => {
        roots[0].should.include({ label: 'Acme', selectable: false, icon: 'pi pi-folder' });
    });

    it('should place leaves under their namespace in order', () => {
        roots[0].children![0].children!.map(_ => _.label).should.deep.equal(['Create', 'Update']);
    });

    it('should describe leaves with the metadata and icon', () => {
        const leaf = roots[0].children![1].children![0];
        leaf.should.deep.equal({
            key: 'leaf:Acme.Billing.Pay', label: 'Pay', selectable: true, icon: 'pi pi-bolt', leaf: true, children: undefined,
            data: { kind: 'leaf', metadata: item('Acme.Billing', 'Pay') },
        });
    });

    it('should give an empty children list to a namespace', () => {
        roots[1].children!.map(_ => _.label).should.deep.equal(['Ping']);
    });
});

describe('when building a tree from nothing', () => {
    it('should have no roots', () => {
        buildNamespaceTree([], 'x').should.deep.equal([]);
    });
});
