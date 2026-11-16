'use client'

import { useTransition } from 'react'
import { changeOrderStatus } from '@/app/admin/actions'

/**
 * Marks the order delivered, then opens WhatsApp with the message to the customer ready to send.
 * Navigates in the same tab once the status is saved: a new tab opened after an `await` is
 * blocked as a pop-up on phones, and on a phone wa.me hands over to the WhatsApp app anyway.
 */
export function DeliverButton({
  orderId,
  whatsappUrl,
  className,
}: {
  orderId: number
  whatsappUrl: string | null
  className?: string
}) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type='button'
      disabled={pending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          const data = new FormData()
          data.set('orderId', String(orderId))
          data.set('status', 'livree')
          await changeOrderStatus(data)
          if (whatsappUrl) window.location.assign(whatsappUrl)
        })
      }
    >
      {pending ? 'Enregistrement…' : whatsappUrl ? 'Livrée (WhatsApp au client)' : 'Livrée'}
    </button>
  )
}
