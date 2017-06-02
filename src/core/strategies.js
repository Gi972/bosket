import { array, tree } from "../tools"

// Selection strategies are triggered while updating the selection
const singleSelect = function(item, selection, neighbours, ancestors) {
    return array(selection).contains(item) ? [] : [item]
}
const multiSelect = function(item, selection, neighbours, ancestors) {
    let alreadySelected = false
    let newSelection = selection.filter(i => {
        // Mark if the item was already selected
        if(!alreadySelected) alreadySelected = i === item
        // Deselect all ancestors
        return i !== item && ancestors.indexOf(i) < 0
    })
    // Categories : deselect all children
    if(!alreadySelected && item[this.inputs.get().category] && item[this.inputs.get().category] instanceof Array) {
        tree(item[this.inputs.get().category], this.inputs.get().category).visit(children => {
            newSelection = array(newSelection).notIn(children)
        })
    }
    if(!alreadySelected) newSelection.push(item)
    return newSelection
}

export const selectionStrategies = {
    single: singleSelect,
    multiple: multiSelect,
    modifiers: function(item, selection, neighbours, ancestors) {
        if(this.modifiers.control || this.modifiers.meta) {
            this.lastSelection = item
            delete this.lastIndex
            delete this.lastPivot
            return multiSelect.bind(this)(item, selection, neighbours, ancestors)
        } else if(this.modifiers.shift) {
            if(!this.lastSelection)
                return selection

            const originIndex = neighbours.indexOf(this.lastSelection)
            if(originIndex < 0)
                return selection

            let newSelection = selection.slice()
            const endIndex = neighbours.indexOf(item)

            if(originIndex >= 0) {
                if(this.lastPivot) {
                    const lastIndex = neighbours.indexOf(this.lastPivot)
                    const [ smaller, higher ] = originIndex > lastIndex ?
                            [ lastIndex, originIndex ] :
                            [ originIndex, lastIndex ]
                    const deletions = neighbours.slice(smaller, higher + 1)
                    newSelection = array(newSelection).notIn(deletions)
                }
                this.lastPivot = item

                const [ smaller, higher ] = originIndex > endIndex ?
                        [ endIndex, originIndex ] :
                        [ originIndex, endIndex ]
                const additions = !this.inputs.get().disabled ?
                    neighbours.slice(smaller, higher + 1) :
                    neighbours.slice(smaller, higher + 1).filter(i => !this.inputs.get().disabled(i))
                newSelection = array(newSelection).notIn(additions)
                newSelection.push(...additions)
            }

            return newSelection
        } else {
            this.lastSelection = item
            delete this.lastIndex
            delete this.lastPivot
            return singleSelect(item, selection.length > 1 ? [] : selection, neighbours, ancestors)
        }
    },
    ancestors: function(item, selection, neighbours, ancestors) {
        return selection.length === 0 ?
                [item] :
            array(selection).contains(item) ?
                [...ancestors] :
            [ ...ancestors, item ]
    }
}

// Click strategies are triggered on item click
export const clickStrategies = {
    "unfold-on-selection": function(item) {
        if(!this.isSelected(item)) {
            const newUnfolded = this.state.get().unfolded.filter(i => i !== item)
            newUnfolded.push(item)
            this.state.set({ unfolded: newUnfolded })
        }
    },
    "toggle-fold": function(item) {
        const newUnfolded = this.state.get().unfolded.filter(i => i !== item)
        if(newUnfolded.length === this.state.get().unfolded.length) {
            newUnfolded.push(item)
        }
        this.state.set({ unfolded: newUnfolded })
    }
}

// Fold strategies are triggered during render to fold / unfold children
export const foldStrategies = {
    "opener-control": function(item) {
        return !array(this.state.get().unfolded).contains(item)
    },
    "not-selected": function(item) {
        return !this.isSelected(item)
    },
    "no-child-selection": function(item) {
        // naive ...
        const recurseCheck = node =>
            this.isSelected(node) ||
            node[this.inputs.get().category] &&
            node[this.inputs.get().category] instanceof Array &&
            node[this.inputs.get().category].some(recurseCheck)
        return !recurseCheck(item)
    },
    "max-depth": function() {
        return this.inputs.get().maxDepth && !isNaN(parseInt(this.inputs.get().maxDepth, 10)) ?
            this.inputs.get().depth >= parseInt(this.inputs.get().maxDepth, 10) :
            false
    }
}