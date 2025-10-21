// Tymczasowy mock PayU dla development - zwraca symulowane dane
export function createMockPayUOrder(orderData: Record<string, unknown>) {
  console.log('MOCK PayU Order - dane:', orderData)
  
  // Symulujemy odpowiedź PayU
  return {
    status: {
      statusCode: 'SUCCESS'
    },
    redirectUri: 'http://localhost:3001/payment-success?mock=true', // Mock URL - przekierowanie do lokalnej strony sukcesu
    orderId: `mock-order-${Date.now()}`,
    extOrderId: orderData.description || 'mock-ext-order'
  }
}
