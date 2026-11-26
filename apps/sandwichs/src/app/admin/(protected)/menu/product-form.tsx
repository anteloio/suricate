'use client'

import { useState } from 'react'
import { AddDialog, Switch, useAutoSave } from '@/components/admin-form'
import type { Category, Product } from '@/lib/db/schema'
import { saveProduct } from '../../actions'

const on = (value: boolean) => (value ? 'on' : null)

/** A menu product: saves itself (fields on blur, category and switches right away). */
export function ProductEditor({ product }: { product: Product }) {
  const [active, setActive] = useState(product.active)
  const [formula, setFormula] = useState(product.formulaEligible)
  const [category, setCategory] = useState<Category>(product.category)
  const { formProps, save, onBlur } = useAutoSave(saveProduct, () => ({
    active: on(active),
    formulaEligible: on(formula),
  }))
  const price = (product.priceCents / 100).toFixed(2).replace('.', ',')

  return (
    <form {...formProps} className={`card space-y-3 transition-opacity ${active ? '' : 'opacity-60'}`}>
      <input type='hidden' name='id' value={product.id} />
      <div className='flex items-end gap-4'>
        <label className='block min-w-0 flex-1'>
          <span className='label'>Nom</span>
          <input name='name' required defaultValue={product.name} onBlur={onBlur} className='input mt-1' />
        </label>
        <Switch
          label='En vente'
          checked={active}
          onChange={(next) => {
            setActive(next)
            save({ active: on(next) })
          }}
        />
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-[8rem_10rem_1fr]'>
        <label>
          <span className='label'>Prix (€)</span>
          <input
            name='price'
            required
            inputMode='decimal'
            defaultValue={price}
            onBlur={onBlur}
            className='input mt-1'
          />
        </label>
        <label>
          <span className='label'>Catégorie</span>
          <select
            name='category'
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as Category)
              // The new value is in the form only after this render: send it explicitly.
              save({ category: e.target.value })
            }}
            className='input mt-1'
          >
            <option value='sandwich'>Sandwich</option>
            <option value='boisson'>Boisson</option>
            <option value='dessert'>Dessert</option>
          </select>
        </label>
        <label className='col-span-2 sm:col-span-1'>
          <span className='label'>Description</span>
          <input name='description' defaultValue={product.description} onBlur={onBlur} className='input mt-1' />
        </label>
      </div>
      <div className='grid grid-cols-[1fr_6rem] gap-3'>
        <label>
          <span className='label'>Choix (séparés par des virgules)</span>
          <input
            name='variants'
            placeholder='Ex : Pomme, Cassis, Framboise'
            defaultValue={product.variants.join(', ')}
            onBlur={onBlur}
            className='input mt-1'
          />
        </label>
        <label>
          <span className='label'>Ordre</span>
          <input name='position' type='number' defaultValue={product.position} onBlur={onBlur} className='input mt-1' />
        </label>
      </div>
      {category === 'sandwich' && (
        <Switch
          label='Peut faire partie de la formule'
          checked={formula}
          onChange={(next) => {
            setFormula(next)
            save({ formulaEligible: on(next) })
          }}
        />
      )}
    </form>
  )
}

export function NewProductButton() {
  return (
    <AddDialog buttonLabel='Ajouter un produit' title='Nouveau produit' action={saveProduct}>
      {/* New products are on sale right away, at the end of their section. */}
      <input type='hidden' name='active' value='on' />
      <input type='hidden' name='position' value='99' />
      <div className='grid grid-cols-[1fr_7rem] gap-3'>
        <label>
          <span className='label'>Nom</span>
          <input name='name' required className='input mt-1' />
        </label>
        <label>
          <span className='label'>Prix (€)</span>
          <input name='price' required inputMode='decimal' placeholder='5,50' className='input mt-1' />
        </label>
      </div>
      <label className='block'>
        <span className='label'>Catégorie</span>
        <select name='category' defaultValue='sandwich' className='input mt-1'>
          <option value='sandwich'>Sandwich</option>
          <option value='boisson'>Boisson</option>
          <option value='dessert'>Dessert</option>
        </select>
      </label>
      <label className='block'>
        <span className='label'>Description</span>
        <input name='description' className='input mt-1' />
      </label>
      <label className='block'>
        <span className='label'>Choix (séparés par des virgules)</span>
        <input name='variants' placeholder='Ex : Pomme, Cassis, Framboise' className='input mt-1' />
      </label>
    </AddDialog>
  )
}
