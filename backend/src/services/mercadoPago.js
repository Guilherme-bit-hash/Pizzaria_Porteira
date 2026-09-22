import { MercadoPagoConfig, Payment } from 'mercadopago'
import 'dotenv/config'

let payment = null

// Cria o cliente sob demanda (em vez de na importação) para conseguir dar um erro
// claro quando MP_ACCESS_TOKEN não está configurado, em vez de falhar silenciosamente.
export function getPaymentClient() {
  if (payment) return payment

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error(
      'MP_ACCESS_TOKEN não configurado no .env — crie uma conta no Mercado Pago e gere um access token.'
    )
  }

  const client = new MercadoPagoConfig({ accessToken })
  payment = new Payment(client)
  return payment
}
