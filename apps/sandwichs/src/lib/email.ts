import 'server-only'
import type { Order, OrderLine } from './db/schema'
import { formatEuros } from './money'
import { formatDay } from './time'

type Email = { to: string; subject: string; html: string; text: string }

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise prints the email in the server
 * console (local development). A failed email never blocks an order.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log(
      `\n[email non envoyé : RESEND_API_KEY absent]\nÀ : ${email.to}\nObjet : ${email.subject}\n\n${email.text}\n`
    )
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Suricate <onboarding@resend.dev>',
        to: [email.to],
        reply_to: process.env.EMAIL_REPLY_TO || undefined,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    })
    if (!res.ok) console.error('Resend error', res.status, await res.text())
    return res.ok
  } catch (err) {
    console.error('Resend error', err)
    return false
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}

function recap(order: Order, lines: OrderLine[]) {
  const rows = lines.map((l) => ({
    label: `${l.quantity} × ${l.label}`,
    price: formatEuros(l.quantity * l.unitPriceCents),
  }))
  const text = [
    ...rows.map((r) => `- ${r.label} : ${r.price}`),
    `Total : ${formatEuros(order.totalCents)} (paiement à la livraison : ${order.paymentMethod})`,
    '',
    `Livraison : ${order.addressLabel}${order.addressDetails ? ` (${order.addressDetails})` : ''}`,
  ].join('\n')
  const html = `
    <table style="border-collapse:collapse;width:100%;max-width:480px">
      ${rows.map((r) => `<tr><td style="padding:4px 0">${escape(r.label)}</td><td style="padding:4px 0;text-align:right;white-space:nowrap">${r.price}</td></tr>`).join('')}
      <tr><td style="padding:8px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding:8px 0;border-top:1px solid #ddd;text-align:right"><strong>${formatEuros(order.totalCents)}</strong></td></tr>
    </table>
    <p>Paiement à la livraison : <strong>${escape(order.paymentMethod)}</strong></p>
    <p>Livraison : ${escape(order.addressLabel)}${order.addressDetails ? `<br>${escape(order.addressDetails)}` : ''}</p>`
  return { text, html }
}

function layout(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#171717;line-height:1.5">
    <p style="font-size:22px;letter-spacing:4px;margin:0 0 16px">SURICATE</p>${body}</div>`
}

export function confirmationEmail(order: Order, lines: OrderLine[], deliveryWindow: string): Email {
  const r = recap(order, lines)
  const link = `${siteUrl()}/commande/${order.code}`
  const day = formatDay(order.serviceDate)
  return {
    to: order.email,
    subject: `Commande ${order.code} confirmée : livraison ${day}`,
    text: `Bonjour ${order.customerName},\n\nMerci pour votre commande ${order.code}. Livraison ${day}, ${deliveryWindow}.\n\n${r.text}\n\nSuivre la commande : ${link}\n\nÀ bientôt,\nSuricate`,
    html: layout(`<p>Bonjour ${escape(order.customerName)},</p>
      <p>Merci pour votre commande <strong>${order.code}</strong>. Livraison <strong>${day}, ${escape(deliveryWindow)}</strong>.</p>
      ${r.html}<p><a href="${link}">Suivre ma commande</a></p><p>À bientôt,<br>Suricate</p>`),
  }
}

/** Sent when Bruno marks the order as delivered. */
export function deliveredEmail(order: Order): Email {
  const where = order.addressDetails ? `${order.addressLabel} (${order.addressDetails})` : order.addressLabel
  return {
    to: order.email,
    subject: `Votre commande ${order.code} est arrivée !`,
    text: `Bonjour ${order.customerName},\n\nVotre commande ${order.code} vient d'être livrée : ${where}.\n\nBon appétit !\nSuricate`,
    html: layout(`<p>Bonjour ${escape(order.customerName)},</p>
      <p>Votre commande <strong>${order.code}</strong> vient d'être livrée : ${escape(where)}.</p>
      <p>Bon appétit !<br>Suricate</p>`),
  }
}
