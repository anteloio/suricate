'use client'

import { useActionState } from 'react'
import type { Product } from '@/lib/db/schema'
import { saveProduct } from '../../actions'

export function ProductForm({ product }: { product: Product | null }) {
  const [state, action, pending] = useActionState(saveProduct, undefined)
  const price = product ? (product.priceCents / 100).toFixed(2).replace('.', ',') : ''
  return (
    <form action={action} className={`card space-y-3 ${product && !product.active ? 'opacity-60' : ''}`}>
      {product && <input type='hidden' name='id' value={product.id} />}
      <div className='grid gap-3 sm:grid-cols-[1fr_8rem]'>
        <label>
          <span className='label'>Nom</span>
          <input name='name' required defaultValue={product?.name} className='input mt-1' />
        </label>
        <label>
          <span className='label'>Prix (€)</span>
          <input name='price' required inputMode='decimal' defaultValue={price} className='input mt-1' />
        </label>
      </div>
      <label className='block'>
        <span className='label'>Description</span>
        <input name='description' defaultValue={product?.description} className='input mt-1' />
      </label>
      <div className='grid gap-3 sm:grid-cols-[10rem_1fr_6rem]'>
        <label>
          <span className='label'>Catégorie</span>
          <select name='category' defaultValue={product?.category ?? 'sandwich'} className='input mt-1'>
            <option value='sandwich'>Sandwich</option>
            <option value='boisson'>Boisson</option>
            <option value='dessert'>Dessert</option>
          </select>
        </label>
        <label>
          <span className='label'>Choix (séparés par des virgules)</span>
          <input
            name='variants'
            placeholder='Ex : Pomme, Cassis, Framboise'
            defaultValue={product?.variants.join(', ')}
            className='input mt-1'
          />
        </label>
        <label>
          <span className='label'>Ordre</span>
          <input name='position' type='number' defaultValue={product?.position ?? 99} className='input mt-1' />
        </label>
      </div>
      <div className='flex flex-wrap items-center gap-4'>
        <label className='flex items-center gap-2'>
          <input type='checkbox' name='active' defaultChecked={product?.active ?? true} className='size-4' />
          En vente
        </label>
        <label className='flex items-center gap-2'>
          <input
            type='checkbox'
            name='formulaEligible'
            defaultChecked={product?.formulaEligible ?? false}
            className='size-4'
          />
          Formule (sandwichs)
        </label>
        <div className='ml-auto flex items-center gap-3'>
          {state?.error && <span className='text-sm text-red-600'>{state.error}</span>}
          {state?.ok && !pending && <span className='text-sm text-green-700'>{state.ok}</span>}
          <button disabled={pending} className='btn-primary py-2'>
            {pending ? '…' : product ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </form>
  )
}
