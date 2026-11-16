'use client'

import { useActionState } from 'react'
import { login } from '../actions'

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined)
  return (
    <form action={action} className='mt-6 space-y-3 text-left'>
      <label className='block'>
        <span className='label'>Mot de passe</span>
        <input
          name='password'
          type='password'
          required
          autoFocus
          autoComplete='current-password'
          className='input mt-1'
        />
      </label>
      {state?.error && <p className='text-sm text-red-600'>{state.error}</p>}
      <button disabled={pending} className='btn-primary w-full'>
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>
    </form>
  )
}
