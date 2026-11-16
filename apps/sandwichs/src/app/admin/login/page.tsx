import { Logo } from '@/components/logo'
import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className='mx-auto max-w-sm px-4 py-20 text-center'>
      <Logo className='mx-auto h-12 w-auto' />
      <h1 className='mt-4 text-lg font-semibold'>Espace Bruno</h1>
      <LoginForm />
    </main>
  )
}
